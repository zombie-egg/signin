import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Input } from "../../components/atoms/Input";
import { SealCard } from "../../components/molecules/SealCard";
import { PdfStampCanvas } from "../../components/organisms/PdfStampCanvas";
import { contractApi, sealApi, signTaskApi } from "../../lib/api";
import type { Contract, Seal, SignField, StampPlacement } from "../../types/domain";

const schema = z.object({
  contractId: z.string().min(1, "请选择合同"),
  signerName: z.string().min(1, "请输入签署人"),
  signerContact: z.string().min(5, "请输入联系方式"),
  deadline: z.string().min(1, "请选择截止时间"),
});

type TaskForm = z.infer<typeof schema>;

export function ContractStampPage() {
  const [seals, setSeals] = useState<Seal[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [fileUrl, setFileUrl] = useState("");
  const [stamps, setStamps] = useState<StampPlacement[]>([]);
  const [fields, setFields] = useState<SignField[]>([]);
  const [resultUrl, setResultUrl] = useState("");
  const [submitError, setSubmitError] = useState("");
  const form = useForm<TaskForm>({ resolver: zodResolver(schema) });
  const contractId = form.watch("contractId");
  const activeSeals = useMemo(() => seals.filter((seal) => seal.status === "ENABLED"), [seals]);
  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === contractId),
    [contracts, contractId],
  );
  // 仅 PDF 可在线盖章/签署
  const isPdf = selectedContract?.isPdf ?? false;

  useEffect(() => {
    sealApi.list({ page: 1, pageSize: 50, status: "ENABLED" }).then((result) => setSeals(result.list)).catch(() => setSeals([]));
    // 只列可发起签署的合同（草稿/待签署）
    contractApi.list({ page: 1, pageSize: 100 }).then((result) => {
      setContracts(result.list.filter((c) => c.status === "DRAFT" || c.status === "PENDING_SIGN"));
    }).catch(() => setContracts([]));
  }, []);

  useEffect(() => {
    if (!contractId) return setFileUrl("");
    contractApi.file(contractId).then((result) => setFileUrl(result.url)).catch(() => setFileUrl(""));
  }, [contractId]);

  return (
    <div className="mobile-stack grid grid-cols-12">
      <aside className="col-span-3 border-r-4 border-ink p-3">
        <p className="meta-label">可拖拽印章库</p>
        <h2 className="section-title mt-2">印章素材库</h2>
        <div className="mt-4 grid gap-3">
          {activeSeals.map((seal) => (
            <SealCard key={seal.id} seal={seal} draggable />
          ))}
          {!activeSeals.length ? <Badge tone="red">无可用印章</Badge> : null}
        </div>
      </aside>
      <main className="col-span-6 border-r-4 border-ink p-3">
        {!contractId ? (
          <div className="ink-panel grid min-h-60 place-items-center p-8 text-center">
            <p className="meta-label">请先在右侧选择合同</p>
          </div>
        ) : isPdf ? (
          <PdfStampCanvas
            fileUrl={fileUrl}
            activeSeals={activeSeals}
            onChange={setStamps}
            onFieldsChange={setFields}
          />
        ) : (
          <div className="ink-panel grid min-h-60 place-items-center p-8 text-center">
            <div className="grid gap-3">
              <Badge tone="red">非 PDF 合同</Badge>
              <p className="font-ui text-sm">该合同为 {selectedContract?.fileExt || "非 PDF"} 格式，暂不支持在线盖章/签署。可下载查看，或转为 PDF 后重新上传。</p>
              {fileUrl ? (
                <Button asChild variant="secondary">
                  <a href={fileUrl} target="_blank" rel="noreferrer">下载 / 查看原件</a>
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </main>
      <aside className="col-span-3 p-3">
        <form
          className="mobile-full-button grid gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            setSubmitError("");
            if (!isPdf) return setSubmitError("仅 PDF 合同支持在线盖章与签署");
            try {
              if (stamps.length) await contractApi.stamp(values.contractId, stamps);
              const created = await signTaskApi.create({
                contractId: values.contractId,
                signerName: values.signerName,
                signerContact: values.signerContact,
                deadline: new Date(values.deadline).toISOString(),
                fields,
              });
              setResultUrl(created.signUrl);
            } catch (err) {
              setSubmitError((err as Error).message || "发起任务失败");
            }
          })}
        >
          <div>
            <p className="meta-label">创建签署任务</p>
            <h2 className="section-title mt-2">创建签署任务</h2>
          </div>
          <label className="grid gap-1">
            <span className="meta-label">选择合同</span>
            <select
              className="border-2 border-ink bg-paper p-2 font-ui text-sm"
              {...form.register("contractId")}
            >
              <option value="">— 请选择合同 —</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.serialNo}）{c.isPdf ? "" : " · 非PDF"}
                </option>
              ))}
            </select>
            {form.formState.errors.contractId?.message ? (
              <span className="font-ui text-sm font-bold text-editorial">{form.formState.errors.contractId.message}</span>
            ) : null}
          </label>
          <Input label="签署人姓名" {...form.register("signerName")} error={form.formState.errors.signerName?.message} />
          <Input label="联系方式" {...form.register("signerContact")} error={form.formState.errors.signerContact?.message} />
          <Input label="截止时间" type="datetime-local" {...form.register("deadline")} error={form.formState.errors.deadline?.message} />
          <div className="ink-panel p-3">
            <p className="meta-label">已放置数量</p>
            <p className="font-display text-3xl font-black">{stamps.length} 企业章 / {fields.length} 签名框</p>
            <p className="mt-2 font-ui text-xs text-ink/60">
              从左侧拖印章、从画布顶部「✍ 拖拽放置签名框」拖到 PDF 指定位置。放好后可再拖动微调，点击可删除。
            </p>
          </div>
          {submitError ? <p className="font-ui text-sm font-bold text-editorial">{submitError}</p> : null}
          <Button type="submit" disabled={!fields.length || !isPdf}>
            <Send size={16} />
            发起任务
          </Button>
          {resultUrl ? (
            <div className="border-4 border-editorial p-3">
              <p className="meta-label text-editorial">签署链接（发送给对方签署）</p>
              <a href={resultUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all font-mono text-xs underline">
                {resultUrl}
              </a>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(resultUrl)}>
                  复制链接
                </Button>
                <Button asChild size="sm">
                  <a href={resultUrl} target="_blank" rel="noreferrer">打开签署页</a>
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </aside>
    </div>
  );
}
