# Newsprint 前端组件使用说明

## 设计系统强制项

- 仅亮色模式：`#F9F9F7` 纸张背景、`#111111` 油墨黑、`#E5E5E0` 分割灰、`#CC0000` 编辑红。
- 全局 `body` 已挂载 4x4 点阵 SVG 纹理；大板块使用 `.newsprint-texture` 方格纸纹理。
- 所有元素强制 `.sharp-corners`，圆角为 `0px`。
- hover 卡片仅使用 `box-shadow: 4px 4px 0 0 #111111` 与轻微位移。
- 字体：标题 `Playfair Display`，正文 `Lora`，按钮/导航 `Inter`，元数据 `JetBrains Mono`。
- 表头、导航、标签、哈希、日期统一使用大写、宽字间距、小号等宽字体。

## 原子组件

- `Button`：通过 `class-variance-authority` 提供 `primary`、`secondary`、`ghost`、`link` 四种变体，自动黑白反转 hover。
- `Input`：仅底部 `2px` 黑色边框，等宽字体，符合登录和业务表单规范。
- `Textarea`：黑色实线边框，无圆角。
- `Badge`：状态角标，红色仅用于异常、待签署、作废等关键状态。
- `MetaStrip`：页头版本、归档日期、系统标题。

## 分子/有机体组件

- `SearchBar`：紧凑报纸检索栏。
- `SealCard`：印章卡片，支持 `draggable`，拖拽数据类型为 `application/seal-id`。
- `NewsTable`：折叠边框表格，避免双重边框。
- `Dialog`：Radix Dialog 封装，粗黑边框、无圆角。
- `FileUploadBox`：纸张纹理上传区域。
- `PdfStampCanvas`：`react-pdf` 预览，坐标按后端要求输出 `{ page, posX, posY, width, height }`。
- `SignaturePad`：Canvas 手写签名，导出透明 PNG `File`。

## 页面接口对齐

| 页面 | 请求 | 入参/出参 |
|---|---|---|
| 登录 | `POST /api/auth/login` | `{ username, password }`，保存 `accessToken / refreshToken / user.permissions` |
| 个人中心 | `GET /api/auth/me`, `GET /api/audit-logs` | 权限和操作日志 |
| 印章列表 | `GET /api/seals` | `status/type/page/pageSize` |
| 印章上传 | `POST /api/seals` multipart | `file,name,type`，前端校验透明 PNG、8MB |
| 印章详情 | `GET /api/seals/:id/usage` | 使用记录 |
| 合同列表 | `GET /api/contracts` | `name,serialNo,status,signerName,startDate,endDate,page,pageSize` |
| 合同上传 | `POST /api/contracts` multipart | `file,name,serialNo,remark`，前端校验 PDF、30MB |
| 合同预览 | `GET /api/contracts/:id`, `GET /api/contracts/:id/file` | 详情与预签名 PDF URL |
| 删除合同 | `DELETE /api/contracts/:id` | `contract:delete` 权限，软删除 |
| 企业盖章 | `POST /api/contracts/:id/stamp` | `{ stamps: [{ sealId,page,posX,posY,width,height }] }` |
| 创建任务 | `POST /api/sign-tasks` | `{ contractId,signerName,signerContact,deadline,fields }` |
| 任务列表 | `GET /api/sign-tasks` | 状态、时间、签署人筛选 |
| 任务详情 | `GET /api/sign-tasks/:id` | IP、设备、时间戳、SHA256 |
| 删除签署任务 | `DELETE /api/sign-tasks/:id` | `signtask:delete` 权限，软删除并失效签署链接 |
| 外部签署 | `GET /api/sign/:token` | 待签合同和字段 |
| 外部提交 | `POST /api/sign/:token/submit` multipart | `signatures[][fieldId/signType/file]` |

## 前端安全校验

- 未登录自动跳转 `/login`。
- 无权限菜单自动隐藏；无权限按钮禁用。
- 文件上传前置校验格式与大小。
- 坐标由 PDF overlay 记录，提交前保留页码与尺寸信息。
- 敏感接口按钮已按权限禁用，后端仍需校验 permission code。
