import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../../components/atoms/Button";
import { Input } from "../../components/atoms/Input";
import { Textarea } from "../../components/atoms/Textarea";
import { FileUploadBox } from "../../components/organisms/FileUploadBox";
import { contractApi } from "../../lib/api";
import { assertContractFile } from "../../lib/utils";

const schema = z.object({
  name: z.string().min(1, "请输入合同名称"),
  serialNo: z.string().min(1, "请输入合同编号"),
  remark: z.string().optional(),
});

type ContractForm = z.infer<typeof schema>;

export function ContractUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const form = useForm<ContractForm>({ resolver: zodResolver(schema) });

  return (
    <div className="p-4">
      <form
        className="mobile-full-button ink-panel-heavy grid gap-4 p-4"
        onSubmit={form.handleSubmit(async (values) => {
          if (!file) return setFileError("请选择合同文件");
          const error = assertContractFile(file);
          if (error) return setFileError(error);
          setFileError("");
          try {
            const data = new FormData();
            data.append("file", file);
            data.append("name", values.name);
            data.append("serialNo", values.serialNo);
            data.append("remark", values.remark ?? "");
            const contract = await contractApi.create(data);
            navigate(`/contracts/${contract.id}`);
          } catch (err) {
            setFileError((err as Error).message || "上传失败");
          }
        })}
      >
        <div>
          <p className="meta-label">上传合同</p>
          <h2 className="section-title">合同上传页</h2>
        </div>
        <FileUploadBox
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.tiff,.txt"
          label="拖入或选择合同文件"
          onFile={(next) => {
            setFile(next);
            setFileError(assertContractFile(next));
          }}
        />
        <p className="font-ui text-xs text-ink/60">支持 PDF / Word / Excel / PPT / 图片 / 文本；仅 PDF 可在线盖章与签署。</p>
        {fileError ? <p className="font-ui text-sm font-bold text-editorial">{fileError}</p> : null}
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <Input label="合同名称" {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input label="合同编号" {...form.register("serialNo")} error={form.formState.errors.serialNo?.message} />
        </div>
        <Textarea label="备注" {...form.register("remark")} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          提交合同
        </Button>
      </form>
    </div>
  );
}
