import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../../components/atoms/Button";
import { Input } from "../../components/atoms/Input";
import { useAuthStore } from "../../stores/auth-store";

const schema = z.object({
  username: z.string().min(1, "请输入账号"),
  password: z.string().min(6, "密码至少 6 位"),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState("");
  const form = useForm<LoginForm>({ resolver: zodResolver(schema) });

  return (
    <main className="newsprint-page grid min-h-screen place-items-center p-4">
      <section className="ink-panel-heavy grid w-full max-w-5xl grid-cols-[1.2fr_.8fr] max-md:grid-cols-1">
        <div className="newsprint-texture border-r-4 border-ink p-6 max-md:border-r-0 max-md:border-b-4">
          <p className="meta-label">内部版 / 访问控制</p>
          <h1 className="headline mt-4">内部电子签章系统</h1>
          <p className="dropcap mt-6 max-w-2xl text-justify-news">
            企业合同、印章、签署任务与审计归档在同一份新闻纸版面中完成流转。所有坐标、哈希、时间戳与操作轨迹都会被记录并提交至后端。
          </p>
        </div>
        <form
          className="mobile-full-button grid content-center gap-5 p-6"
          onSubmit={form.handleSubmit(async (values) => {
            setError("");
            try {
              await login(values.username, values.password);
              const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/profile";
              navigate(from, { replace: true });
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "登录失败");
            }
          })}
        >
          <div>
            <p className="meta-label">账号登录</p>
            <h2 className="font-display text-4xl font-black">签入</h2>
          </div>
          <Input label="用户名" autoComplete="username" {...form.register("username")} error={form.formState.errors.username?.message} />
          <Input label="密码" type="password" autoComplete="current-password" {...form.register("password")} error={form.formState.errors.password?.message} />
          {error ? <p className="border border-editorial p-3 font-ui text-sm font-bold text-editorial">{error}</p> : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <LogIn size={16} />
            登录
          </Button>
        </form>
      </section>
    </main>
  );
}
