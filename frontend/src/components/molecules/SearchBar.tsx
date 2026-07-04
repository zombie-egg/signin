import { Search } from "lucide-react";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";

export function SearchBar({ placeholder = "输入关键字", onSearch }: { placeholder?: string; onSearch?: (value: string) => void }) {
  return (
    <form
      className="mobile-full-button flex gap-3 border-b border-ink p-3 max-md:flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSearch?.(String(form.get("keyword") ?? ""));
      }}
    >
      <Input name="keyword" placeholder={placeholder} aria-label={placeholder} />
      <Button type="submit" variant="secondary">
        <Search size={16} />
        查询
      </Button>
    </form>
  );
}
