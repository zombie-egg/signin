# 前端部署说明

## 环境变量

复制 `.env.example` 为 `.env`：

```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_VERSION=NEWSPRINT-0.1.0
```

## 本地开发

```bash
cd frontend
pnpm install
pnpm dev
```

默认访问 `http://localhost:5173`。

## 生产构建

```bash
cd frontend
pnpm build
pnpm preview
```

构建产物在 `frontend/dist`。反向代理需要将 `/api` 指向 NestJS 后端，并将其他路径回退到 `index.html`，以支持 React Router。

## 与后端协作约定

- 所有接口沿用后端统一响应包裹：`{ code, message, data }`。
- 登录后前端在 axios 拦截器中写入 `Authorization: Bearer <accessToken>`。
- 401 会清空本地 session 并跳转登录页。
- PDF 盖章坐标传递为 PDF 页面坐标近似值：`page,posX,posY,width,height`。后端合成前应按实际 PDF 尺寸做边界校验。
- 外部签署页不携带后台 token，仅通过 `/api/sign/:token` 系列接口鉴权。
