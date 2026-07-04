import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/atoms/Badge";
import { PdfStampCanvas } from "../../components/organisms/PdfStampCanvas";
import { contractApi } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { contractStatusText, label } from "../../lib/labels";
import type { Contract } from "../../types/domain";

export function ContractPreviewPage() {
  const { id = "" } = useParams();
  const [contract, setContract] = useState<Contract | null>(null);
  const [fileUrl, setFileUrl] = useState("");

  useEffect(() => {
    if (!id) return;
    contractApi.detail(id).then(setContract).catch(() => setContract(null));
    contractApi.file(id).then((result) => setFileUrl(result.url)).catch(() => setFileUrl(""));
  }, [id]);

  return (
    <div className="mobile-stack grid grid-cols-[320px_1fr]">
      <aside className="newsprint-texture border-r-4 border-ink p-4">
        <p className="meta-label">合同信息</p>
        <h2 className="section-title mt-2">{contract?.name ?? "合同预览"}</h2>
        <p className="dropcap mt-4 text-justify-news">
          该页面用于在线预览合同原件。合同编号、上传时间、状态与文件来源会作为签署任务创建前的核对信息展示。
        </p>
        <dl className="mt-6 grid gap-3">
          <div>
            <dt className="meta-label">编号</dt>
            <dd className="meta-value">{contract?.serialNo}</dd>
          </div>
          <div>
            <dt className="meta-label">状态</dt>
            <dd><Badge tone={contract?.status === "VOIDED" ? "red" : "black"}>{contract?.status ? label(contractStatusText, contract.status) : "-"}</Badge></dd>
          </div>
          <div>
            <dt className="meta-label">上传时间</dt>
            <dd className="meta-value">{formatDate(contract?.uploadedAt ?? contract?.createdAt)}</dd>
          </div>
        </dl>
      </aside>
      <main className="p-4">
        <PdfStampCanvas fileUrl={fileUrl} />
      </main>
    </div>
  );
}
