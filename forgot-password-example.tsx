import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type {
  ErrorItem,
  ResetPasswordRequestOptions,
} from "@auth0/auth0-acul-react/types";

import Captcha from "@/components/Captcha/index";
import { ULThemeFloatingLabelField, ULThemeFormMessage } from "@/components/form";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { ULThemeButton } from "@/components/ULThemeButton";
import { ULThemeAlert, ULThemeAlertTitle } from "@/components/ULThemeError";
import { useCaptcha } from "@/hooks/useCaptcha";

import { useResetPasswordRequestManager } from "../hooks/resetPasswordRequestManager";

type Mode = "email" | "phone";

type CountryOption = {
  code: string;
  name: string;
  dial: string; 
  flag: string; 
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
];

function digitsOnly(value: string) {
  return (value || "").replace(/[^\d]/g, "");
}

function toE164(dial: string, nationalNumber: string) {
  const d = dial.startsWith("+") ? dial : `+${dial}`;
  const n = digitsOnly(nationalNumber);
  return n ? `${d}${n}` : "";
}

type FormValues = ResetPasswordRequestOptions & {
  email: string;
  phoneNational: string;
};

function ResetPasswordRequestForm() {
  const {
    handleResetPasswordRequest,
    texts,
    isCaptchaAvailable,
    captcha,
    useErrors,
    locales,
    inputfield,
  } = useResetPasswordRequestManager();

  const { errors, hasError, dismiss } = useErrors;

  const initialMode: Mode = useMemo(() => {
    const prefill = String(inputfield ?? "");
    return prefill.trim().startsWith("+") ? "phone" : "email";
  }, [inputfield]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [country, setCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);

  const emailLabel = texts?.emailLabel ?? "Email address";
  const phoneLabel = texts?.phoneLabel ?? "Phone number";
  const buttonText = texts?.buttonText || locales.form.button;

  const requiredMsg =
    texts?.identifierRequired ?? "Please enter an email or phone number.";

  const captchaLabel = texts?.captchaCodePlaceholder
    ? `${texts.captchaCodePlaceholder}*`
    : `${locales.form.fields.captcha.label}*`;

  const form = useForm<FormValues>({
    defaultValues: {
      username: "", 
      captcha: "",
      email: String(inputfield ?? ""),
      phoneNational: "",
    },
    mode: "onSubmit",
  });

  const {
    formState: { isSubmitting },
    setValue,
    getValues,
    clearErrors,
  } = form;

  const generalErrors: ErrorItem[] =
    errors.byType("auth0")?.filter((e) => !e.field) || [];

  const usernameSDKError = errors.byField("username")[0]?.message;
  const captchaSDKError = errors.byField("captcha")[0]?.message;

  const { captchaConfig, captchaProps, captchaValue } = useCaptcha(
    captcha || undefined,
    captchaLabel
  );

  // Clear the *UI* field errors when switching tabs
  useEffect(() => {
    clearErrors(["email", "phoneNational", "username"]);
  }, [mode, clearErrors]);

  useEffect(() => {
    const email = String(getValues("email") ?? "");
    if (mode === "email" && email.trim().startsWith("+")) {
      setMode("phone");
      setValue("phoneNational", email.replace(/^\+\d+/, "")); 
    }
  }, []);

  const onSubmit = async (values: FormValues) => {
    let username = "";

    if (mode === "email") {
      username = (values.email || "").trim();
    } else {
      username = toE164(country.dial, values.phoneNational || "");
    }

    setValue("username", username, { shouldDirty: true, shouldValidate: false });

    await handleResetPasswordRequest(username, captchaValue);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* General error messages */}
        {hasError && generalErrors.length > 0 && (
          <div className="mb-4 space-y-3">
            {generalErrors.map((error) => (
              <ULThemeAlert
                key={error.id}
                variant="destructive"
                onDismiss={() => dismiss(error.id)}
              >
                <ULThemeAlertTitle>{error.message}</ULThemeAlertTitle>
              </ULThemeAlert>
            ))}
          </div>
        )}

        <input type="hidden" {...form.register("username")} />

        {/* Mode toggle */}
        <div className="mb-4">
          <div className="grid grid-cols-2 rounded-md border border-input bg-background p-1">
            <button
              type="button"
              onClick={() => setMode("email")}
              className={[
                "h-10 rounded-md text-sm font-medium transition",
                mode === "email"
                  ? "bg-muted text-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              Email
            </button>

            <button
              type="button"
              onClick={() => setMode("phone")}
              className={[
                "h-10 rounded-md text-sm font-medium transition",
                mode === "phone"
                  ? "bg-muted text-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              Phone
            </button>
          </div>
        </div>

        {/* EMAIL MODE */}
        {mode === "email" && (
          <FormField
            control={form.control}
            name="email"
            rules={{
              required: requiredMsg,
              pattern: {
                value: /^\S+@\S+\.\S+$/,
                message: "Email is not valid.",
              },
            }}
            render={({ field, fieldState }) => (
              <FormItem>
                <ULThemeFloatingLabelField
                  {...field}
                  label={emailLabel}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  error={!!fieldState.error || !!usernameSDKError}
                />
                <ULThemeFormMessage
                  sdkError={usernameSDKError}
                  hasFormError={!!fieldState.error}
                />
              </FormItem>
            )}
          />
        )}

        {/* PHONE MODE */}
        {mode === "phone" && (
          <div className="space-y-3">
            {/* Country dropdown */}
            <div className="relative">
              <select
                value={country.code}
                onChange={(e) => {
                  const next = COUNTRY_OPTIONS.find((c) => c.code === e.target.value);
                  if (next) setCountry(next);
                }}
                className={[
                  "w-full h-[58px] rounded-md border border-input bg-background px-4 pr-10",
                  "text-base font-medium outline-none appearance-none",
                ].join(" ")}
                aria-label="Country code"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}, {c.code}, {c.dial}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-foreground/60">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Phone national number */}
            <FormField
              control={form.control}
              name="phoneNational"
              rules={{
                required: requiredMsg,
                validate: (v) => {
                  const e164 = toE164(country.dial, v || "");
                  return e164.length >= 8 ? true : "Phone number is not valid.";
                },
              }}
              render={({ field, fieldState }) => (
                <FormItem>
                  <ULThemeFloatingLabelField
                    {...field}
                    label={phoneLabel}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    autoFocus
                    error={!!fieldState.error || !!usernameSDKError}
                  />
                  <ULThemeFormMessage
                    sdkError={usernameSDKError}
                    hasFormError={!!fieldState.error}
                  />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* CAPTCHA */}
        {isCaptchaAvailable && captchaConfig && (
          <Captcha
            control={form.control as any}
            name="captcha"
            captcha={captchaConfig}
            {...captchaProps}
            sdkError={captchaSDKError}
            rules={{ required: locales.form.fields.captcha.required }}
            className="mt-2 mb-4"
          />
        )}

        {/* Submit */}
        <div className="mt-4">
          <ULThemeButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? `${locales.form.submittingState}...` : buttonText}
          </ULThemeButton>
        </div>
      </form>
    </Form>
  );
}

export default ResetPasswordRequestForm;
