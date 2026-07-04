import { Eye, FilePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { SearchBar } from "../../components/molecules/SearchBar";
import { NewsTable } from "../../components/organisms/NewsTable";
import { contractApi } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { contractStatusText, label } from "../../lib/labels";
import { useCacheStore } from "../../stores/cache-store";
import type { Contract } from "../../types/domain";

export function ContractsPage() {
  const [contracts, setLocalContracts] = useState<Contract[]>([]);
  const setContracts = useCacheStore((state) => state.setContracts);

  function load(params?: Record<string, unknown>) {
    contractApi
      .list({ page: 1, pageSize: 20, ...params })
      .then((result) => {
        setLocalContracts(result.list);
        setContracts(result.list);
      })
      .catch(() => setLocalContracts([]));
  }

  useEffect(() => load(), []);

  return (
    <div className="grid gap-4 p-4">
      <section className="ink-panel-heavy">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-ink p-4">
          <div>
            <p className="meta-label">合同草稿</p>
            <h2 className="section-title border-b-0 pb-0">合同草稿列表</h2>
          </div>
          <Button asChild>
            <Link to="/contracts/upload">
              <FilePlus size={16} />
              上传合同
            </Link>
          </Button>
        </div>
        <SearchBar placeholder="合同名称、编号、签署人" onSearch={(keyword) => load({ name: keyword, serialNo: keyword })} />
        <NewsTable
          rows={contracts}
          columns={[
            { key: "name", title: "名称", render: (row) => <span className="font-display text-lg font-black">{row.name}</span> },
            { key: "serial", title: "编号", render: (row) => <span className="meta-value">{row.serialNo}</span> },
            { key: "time", title: "上传时间", render: (row) => <span className="meta-value">{formatDate(row.uploadedAt ?? row.createdAt)}</span> },
            {
              key: "status",
              title: "状态",
              render: (row) => <Badge tone={row.status === "VOIDED" || row.status === "PENDING_SIGN" ? "red" : "black"}>{label(contractStatusText, row.status)}</Badge>,
            },
            {
              key: "action",
              title: "操作",
              render: (row) => (
                <Button asChild size="sm" variant="secondary">
                  <Link to={`/contracts/${row.id}`}>
                    <Eye size={14} />
                    预览
                  </Link>
                </Button>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
