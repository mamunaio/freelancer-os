import { setRequestLocale } from "next-intl/server";

import { connectMongoose } from "@/lib/db/client";
import { User } from "@/lib/db/models";
import { requireOrgContext } from "@/lib/auth/session";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { DangerZone } from "@/components/settings/danger-zone";
import type { Locale } from "@/i18n/routing";
import type { ThemePreference } from "@/components/theme-provider";

export default async function SettingsProfilePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);

  await connectMongoose();
  const user = await User.findById(ctx.session.userId)
    .select("+passwordHash name email image locale themeMode")
    .lean();

  if (!user) {
    // Shouldn't happen — requireOrgContext already checks, but bail safely.
    return null;
  }

  // Show the password section only if the user has a credentials login.
  // OAuth-only accounts get the section hidden — they'd need to set a
  // password first, which lands when we wire the "set password" flow later.
  const hasPassword = Boolean(user.passwordHash);

  // Owners can't self-delete. The current member row tells us their role.
  const isOwner = ctx.role === "owner";

  // Theme preference is stored as "dark" | "light" today; widen to include
  // "system" once we ship that field. Default falls back to dark.
  const themeMode: ThemePreference =
    (user.themeMode as ThemePreference) ?? "dark";

  return (
    <div className="space-y-12">
      <ProfileForm
        locale={locale}
        initial={{
          name: user.name ?? "",
          email: user.email,
          image: user.image ?? "",
          locale: (user.locale as Locale) ?? "en",
          themeMode,
        }}
      />

      {hasPassword && <PasswordForm locale={locale} />}

      <DangerZone
        locale={locale}
        email={user.email}
        isOwner={isOwner}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";
