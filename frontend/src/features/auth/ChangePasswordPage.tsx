import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "../../components/atoms/Button";
import { Input } from "../../components/atoms/Input";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../stores/auth-store";

const schema = z
  .object({
    oldPassword: z.string().min(6, "请输入原密码"),
    newPassword: z.string().min(6, "新密码至少 6 位"),
    confirmPassword: z.string().min(6, "请再次输入新密码"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const logoutLocal = useAuthStore((state) => state.logoutLocal);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const form = useForm<PasswordForm>({ resolver: zodResolver(schema) });

  return (
    <div className="grid gap-4 p-4">
      <section className="ink-panel-heavy p-4">
        <p className="meta-label">账户安全</p>
        <h2 className="section-title mt-2">修改密码</h2>
        <form
          className="mobile-full-button mt-4 grid max-w-md gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError("");
            setMessage("");
            try {
              await authApi.changePassword({
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
              });
              setMessage("密码修改成功，请重新登录");
              setTimeout(() => {
                logoutLocal();
                navigate("/login");
              }, 1200);
            } catch (err) {
              setError((err as Error).message || "修改失败");
            }
          })}
        >
          <Input
            label="原密码"
            type="password"
            {...form.register("oldPassword")}
            error={form.formState.errors.oldPassword?.message}
          />
          <Input
            label="新密码"
            type="password"
            {...form.register("newPassword")}
            error={form.formState.errors.newPassword?.message}
          />
          <Input
            label="确认新密码"
            type="password"
            {...form.register("confirmPassword")}
            error={form.formState.errors.confirmPassword?.message}
          />
          {error ? <p className="font-ui text-sm font-bold text-editorial">{error}</p> : null}
          {message ? <p className="font-ui text-sm font-bold">{message}</p> : null}
          <Button type="submit">提交修改</Button>
        </form>
      </section>
    </div>
  );
}
