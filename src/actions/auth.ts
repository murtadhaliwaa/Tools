"use server";

import { redirect } from "next/navigation";
import {
  AuthError,
  clearRoleCookie,
  ensureProfile,
  syncRoleCookie,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toArabicErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validations";
import {
  type ActionResult,
  guardRate,
  requireSiteUrl,
} from "@/actions/shared";
import {
  isBootstrapPending,
  verifyBootstrapSecret,
} from "@/lib/bootstrap";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const limited = await guardRate("login", 8);
  if (limited) return limited;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "تحقق من البيانات المدخلة",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { success: false, message: "بيانات الدخول غير صحيحة" };
  }

  const fullName =
    (data.user.user_metadata?.full_name as string | undefined) ??
    parsed.data.email.split("@")[0];

  let profile;
  try {
    profile = await ensureProfile(data.user.id, fullName);
  } catch (err) {
    await supabase.auth.signOut();
    await clearRoleCookie();
    if (err instanceof AuthError) {
      return { success: false, message: err.message };
    }
    throw err;
  }
  if (!profile.isActive) {
    await supabase.auth.signOut();
    await clearRoleCookie();
    return {
      success: false,
      message: "الحساب بانتظار موافقة المدير قبل تسجيل الدخول",
    };
  }

  await syncRoleCookie(profile.role);
  redirect("/dashboard");
}

export async function signupAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const limited = await guardRate("signup", 5);
  if (limited) return limited;

  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "تحقق من البيانات المدخلة",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingCount = await prisma.profile.count();
  const bootstrapPending = isBootstrapPending(existingCount);
  let bootstrapOk = false;

  if (bootstrapPending) {
    const check = verifyBootstrapSecret(
      String(formData.get("bootstrapSecret") ?? ""),
    );
    if (!check.ok) {
      return { success: false, message: check.message };
    }
    bootstrapOk = true;
  }

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true, allowPublicSignup: true },
  });

  if (orgs.length > 1) {
    return {
      success: false,
      message: "التسجيل التلقائي غير متاح. اطلب من المدير إنشاء حسابك.",
    };
  }

  const org = orgs[0];
  if (!bootstrapPending && org && !org.allowPublicSignup) {
    return {
      success: false,
      message:
        "التسجيل مغلق. اطلب من المدير تفعيل حسابك أو فتح التسجيل من الإعدادات.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return { success: false, message: toArabicErrorMessage(error) };
  }

  if (data.user) {
    let profile;
    try {
      profile = await ensureProfile(data.user.id, parsed.data.fullName, {
        // أول مدير يُفعَّل عبر isFirst+bootstrapOk فقط — لا تفعيل عبر سباق الرمز
        activate: false,
        bootstrapOk,
      });
    } catch (err) {
      await supabase.auth.signOut();
      if (err instanceof AuthError) {
        return { success: false, message: err.message };
      }
      throw err;
    }

    if (!profile.isActive) {
      await supabase.auth.signOut();
      return {
        success: true,
        message:
          "تم إنشاء الحساب وهو بانتظار موافقة المدير قبل إمكانية الدخول.",
      };
    }
  }

  if (!data.session) {
    return {
      success: true,
      message:
        "تم إنشاء الحساب. إن كان تأكيد البريد مفعّلاً، أكّد بريدك ثم سجّل الدخول.",
    };
  }

  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const limited = await guardRate("forgot", 5);
  if (limited) return limited;

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { success: false, message: "أدخل بريداً إلكترونياً صالحاً" };
  }

  const siteUrl = requireSiteUrl();
  if (!siteUrl) {
    return {
      success: false,
      message: "إعدادات الموقع غير مكتملة. تواصل مع المدير.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/reset`,
  });

  if (error) {
    return { success: false, message: toArabicErrorMessage(error) };
  }

  return {
    success: true,
    message: "إن وُجد الحساب، ستصلك رسالة لإعادة تعيين كلمة المرور.",
  };
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const limited = await guardRate("reset-password", 5);
  if (limited) return limited;

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "كلمة المرور غير مستوفية للشروط (8 أحرف + حرف ورقم)",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, message: toArabicErrorMessage(error) };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearRoleCookie();
  redirect("/login");
}
