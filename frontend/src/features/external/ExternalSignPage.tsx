import { Check, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { FileUploadBox } from "../../components/organisms/FileUploadBox";
import { PdfStampCanvas } from "../../components/organisms/PdfStampCanvas";
import { SignaturePad } from "../../components/organisms/SignaturePad";
import { signApi } from "../../lib/api";
import { assertTransparentPng, formatDate } from "../../lib/utils";
import type { PublicSignPayload } from "../../types/domain";

export function ExternalSignPage() {
  const { token = "" } = useParams();
  const [payload, setPayload] = useState<PublicSignPayload | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [personalSeal, setPersonalSeal] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ signedAt: string; sha256: string; archiveUrl?: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    signApi.detail(token).then(setPayload).catch((reason) => setError(reason instanceof Error ? reason.message : "签署链接无效"));
  }, [token]);

  if (receipt) {
    return (
      <main className="newsprint-page grid min-h-screen place-items-center p-4">
        <section className="ink-panel-heavy max-w-3xl p-6">
          <Badge tone="black">已签署</Badge>
          <h1 className="headline mt-4">签署成功</h1>
          <dl className="mt-6 grid gap-3">
            <div>
              <dt className="meta-label">签署时间</dt>
              <dd className="meta-value">{formatDate(receipt.signedAt)}</dd>
            </div>
            <div>
              <dt className="meta-label">SHA256 哈希</dt>
              <dd className="break-all font-mono text-xs">{receipt.sha256}</dd>
            </div>
          </dl>
          {receipt.archiveUrl ? (
            <Button asChild className="mt-6">
              <a href={receipt.archiveUrl}>下载已签署合同</a>
            </Button>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="newsprint-page">
      <div className="border-b-4 border-ink p-4">
        <p className="meta-label">外部签署链接</p>
        <h1 className="font-display text-4xl font-black">{payload?.contractName ?? "合同签署"}</h1>
        <p className="meta-value">签署人 {payload?.signerName ?? "-"} / 截止 {formatDate(payload?.deadline)}</p>
      </div>
      {error ? <p className="m-4 border-4 border-editorial p-4 font-ui font-bold text-editorial">{error}</p> : null}
      <div className="mobile-stack grid grid-cols-[1fr_360px]">
        <section className="border-r-4 border-ink p-4">
          <PdfStampCanvas fileUrl={payload?.previewUrl} />
        </section>
        <aside className="grid content-start gap-4 p-4">
          <section className="ink-panel p-3">
            <p className="meta-label">方式一</p>
            <h2 className="font-display text-2xl font-black">手写签名</h2>
            <SignaturePad onChange={setSignature} />
          </section>
          <section className="ink-panel p-3">
            <p className="meta-label">方式二</p>
            <h2 className="font-display text-2xl font-black">上传个人透明印章</h2>
            <FileUploadBox
              accept="image/png"
              label="选择个人印章 PNG"
              onFile={(file) => {
                const message = assertTransparentPng(file);
                if (message) setError(message);
                else {
                  setError("");
                  setPersonalSeal(file);
                }
              }}
            />
          </section>
          <Button
            disabled={!signature && !personalSeal}
            onClick={async () => {
              const form = new FormData();
              payload?.fields.forEach((field, index) => {
                form.append(`signatures[${index}][fieldId]`, field.fieldId ?? "");
                form.append(`signatures[${index}][signType]`, signature ? "1" : "2");
                form.append(`signatures[${index}][file]`, signature ?? personalSeal!);
              });
              const result = await signApi.submit(token, form);
              setReceipt(result);
            }}
          >
            <Check size={16} />
            提交签署
          </Button>
          <div className="border border-ink p-3">
            <p className="meta-label">待签字段</p>
            <p className="font-display text-3xl font-black">{payload?.fields.length ?? 0}</p>
            <p className="font-ui text-xs">坐标由后端返回的字段位置决定，签署文件按 fieldId 回传。</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
