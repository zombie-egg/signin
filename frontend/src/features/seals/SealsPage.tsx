import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Input } from "../../components/atoms/Input";
import { SealCard } from "../../components/molecules/SealCard";
import { SearchBar } from "../../components/molecules/SearchBar";
import { Dialog } from "../../components/organisms/Dialog";
import { FileUploadBox } from "../../components/organisms/FileUploadBox";
import { sealApi } from "../../lib/api";
import { assertTransparentPng } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth-store";
import { useCacheStore } from "../../stores/cache-store";
import type { Seal } from "../../types/domain";

const schema = z.object({
  name: z.string().min(1, "请输入印章名称"),
  type: z.string().min(1, "请输入印章类型"),
});

type SealForm = z.infer<typeof schema>;

export function SealsPage() {
  const [seals, setLocalSeals] = useState<Seal[]>([]);
  const setSeals = useCacheStore((state) => state.setSeals);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const form = useForm<SealForm>({ resolver: zodResolver(schema), defaultValues: { type: "COMPANY" } });

  function load(params?: Record<string, unknown>) {
    sealApi
      .list({ page: 1, pageSize: 24, ...params })
      .then((result) => {
        setLocalSeals(result.list);
        setSeals(result.list);
      })
      .catch(() => setLocalSeals([]));
  }

  useEffect(() => load(), []);

  return (
    <div className="grid gap-4 p-4">
      <section className="ink-panel-heavy">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-ink p-4">
          <div>
            <p className="meta-label">印章资产</p>
            <h2 className="section-title border-b-0 pb-0">印章管理</h2>
          </div>
          <Dialog
            title="上传透明 PNG 印章"
            trigger={
              <Button disabled={!hasPermission("seal:upload")}>
                <Plus size={16} />
                上传印章
              </Button>
            }
          >
            <form
              className="mobile-full-button grid gap-4"
              onSubmit={form.handleSubmit(async (values) => {
                if (!file) return setFileError("请选择透明 PNG 图片");
                const error = assertTransparentPng(file);
                if (error) return setFileError(error);
                const data = new FormData();
                data.append("file", file);
                data.append("name", values.name);
                data.append("type", values.type);
                await sealApi.create(data);
                load();
              })}
            >
              <FileUploadBox
                accept="image/png"
                label="选择透明 PNG"
                onFile={(next) => {
                  setFile(next);
                  setFileError(assertTransparentPng(next));
                }}
              />
              {fileError ? <p className="font-ui text-sm font-bold text-editorial">{fileError}</p> : null}
              <Input label="印章名称" {...form.register("name")} error={form.formState.errors.name?.message} />
              <Input label="印章类型" {...form.register("type")} error={form.formState.errors.type?.message} />
              <Button type="submit">提交上传</Button>
            </form>
          </Dialog>
        </div>
        <SearchBar placeholder="按印章名称查询" onSearch={(keyword) => load({ name: keyword })} />
      </section>
      <section className="grid grid-cols-4 gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
        {seals.map((seal) => (
          <div key={seal.id} className="grid gap-2">
            <SealCard
              seal={seal}
              canUpdate={hasPermission("seal:update")}
              canDelete={hasPermission("seal:delete")}
              onToggle={() => {
                sealApi.updateStatus(seal.id, seal.status === "ENABLED" ? "DISABLED" : "ENABLED").then(() => load());
              }}
              onDelete={() => {
                if (!window.confirm(`确认删除印章「${seal.name}」？删除后不可用于盖章。`)) return;
                sealApi.remove(seal.id).then(() => load());
              }}
            />
            <Button asChild variant="ghost">
              <Link to={`/seals/${seal.id}`}>查看使用历史</Link>
            </Button>
          </div>
        ))}
      </section>
      {!seals.length ? (
        <div className="ink-panel p-8 text-center">
          <Badge>暂无印章</Badge>
          <p className="mt-3 font-ui text-sm">暂无印章数据，等待后端返回或上传透明 PNG。</p>
        </div>
      ) : null}
    </div>
  );
}
