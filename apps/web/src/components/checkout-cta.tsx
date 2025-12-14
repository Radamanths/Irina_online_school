"use client";
import { useEffect, useState } from "react";
import type { CourseDetail } from "../lib/types";
import { createCheckoutSession } from "../lib/payments";
import { fetchCoursePlans, type SubscriptionPlan } from "../lib/subscriptions";
import { Button } from "@virgo/ui";
import { useCopy } from "../hooks/use-copy";

interface Props {
  course: CourseDetail;
  locale: string;
  userId: string | null;
}

export function CheckoutCTA({ course, locale, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>(ONE_TIME_OPTION);
  const copy = useCopy();
  const {
    checkout: {
      enroll,
      loginRequired,
      error: errorCopy,
      subscriptionHeading,
      subscriptionOneTimeLabel,
      subscriptionOneTimeDescription,
      subscriptionPlansLoading,
      subscriptionPlansError,
      subscriptionPlansEmpty,
      subscriptionSetupFeeLabel
    },
    coursesDetail: { lifetimeAccess }
  } = copy;
  const currency = detectCurrency(course.price);
  const isAuthenticated = Boolean(userId);
  const selectedPlan = selectedOption === ONE_TIME_OPTION ? null : plans.find(plan => plan.id === selectedOption) ?? null;
  const checkoutCurrency = selectedPlan?.currency ?? currency;
  const cohortCode = resolveCohortCode(course);

  useEffect(() => {
    setSelectedOption(ONE_TIME_OPTION);
    let isMounted = true;
    const controller = new AbortController();

    async function loadPlans() {
      setPlansLoading(true);
      setPlansError(null);
      setPlans([]);
      try {
        const response = await fetchCoursePlans(course.id, {
          cohortCode,
          signal: controller.signal
        });
        if (!isMounted) {
          return;
        }
        setPlans(response);
      } catch (err) {
        if (controller.signal.aborted || !isMounted) {
          return;
        }
        console.error("Failed to load subscription plans", err);
        setPlansError(subscriptionPlansError);
      } finally {
        if (isMounted) {
          setPlansLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [course.id, cohortCode, subscriptionPlansError]);

  useEffect(() => {
    if (selectedOption === ONE_TIME_OPTION) {
      return;
    }
    const stillExists = plans.some(plan => plan.id === selectedOption);
    if (!stillExists) {
      setSelectedOption(ONE_TIME_OPTION);
    }
  }, [plans, selectedOption]);

  async function handleCheckout() {
    if (!userId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await createCheckoutSession({
        courseId: course.id,
        userId,
        currency: checkoutCurrency,
        locale,
        subscriptionPlanId: selectedPlan?.id
      });
      window.location.href = session.url;
    } catch (err) {
      console.error("Failed to create checkout session", err);
      setError(errorCopy);
    } finally {
      setLoading(false);
    }
  }

  const hasPlans = plans.length > 0;

  return (
    <aside className="checkout-cta">
      <div>
        <h3>{course.price}</h3>
        <p>{lifetimeAccess}</p>
      </div>
      <div className="checkout-cta__plans">
        <p className="checkout-cta__plans-heading">{subscriptionHeading}</p>
        <div className="checkout-cta__options">
          {renderOneTimeOption({
            lifetimeAccess,
            price: course.price,
            selected: selectedOption === ONE_TIME_OPTION,
            onSelect: () => setSelectedOption(ONE_TIME_OPTION),
            label: subscriptionOneTimeLabel,
            description: subscriptionOneTimeDescription
          })}
          {!plansLoading && !plansError &&
            plans.map(plan =>
              renderPlanOption({
                plan,
                locale,
                isSelected: selectedOption === plan.id,
                onSelect: () => setSelectedOption(plan.id),
                subscriptionSetupFeeLabel
              })
            )}
        </div>
        {plansLoading && <p className="checkout-cta__hint">{subscriptionPlansLoading}</p>}
        {plansError && <p className="checkout-cta__error">{plansError}</p>}
        {!plansLoading && !plansError && !hasPlans && (
          <p className="checkout-cta__hint">{subscriptionPlansEmpty}</p>
        )}
      </div>
      {!isAuthenticated && <p className="checkout-cta__hint">{loginRequired}</p>}
      {error && <p className="checkout-cta__error">{error}</p>}
      <Button onClick={handleCheckout} disabled={!isAuthenticated || loading} fullWidth>
        {loading ? "..." : isAuthenticated ? enroll : loginRequired}
      </Button>
    </aside>
  );
}

const ONE_TIME_OPTION = "one_time";

interface OneTimeOptionProps {
  lifetimeAccess: string;
  price?: string;
  selected: boolean;
  onSelect: () => void;
  label: string;
  description: string;
}

function renderOneTimeOption(props: OneTimeOptionProps) {
  const { lifetimeAccess, price, selected, onSelect, label, description } = props;
  return (
    <label className={`checkout-cta__option${selected ? " is-selected" : ""}`}>
      <input
        type="radio"
        name="checkout-option"
        value={ONE_TIME_OPTION}
        checked={selected}
        onChange={onSelect}
      />
      <div className="checkout-cta__option-body">
        <div className="checkout-cta__option-main">
          <div>
            <p className="checkout-cta__option-title">{label}</p>
            <p className="checkout-cta__option-description">{description}</p>
          </div>
          <strong className="checkout-cta__option-price">{price ?? "—"}</strong>
        </div>
        <div className="checkout-cta__option-meta">
          <span>{lifetimeAccess}</span>
        </div>
      </div>
    </label>
  );
}

interface PlanOptionProps {
  plan: SubscriptionPlan;
  locale: string;
  isSelected: boolean;
  onSelect: () => void;
  subscriptionSetupFeeLabel: string;
}

function renderPlanOption({ plan, locale, isSelected, onSelect, subscriptionSetupFeeLabel }: PlanOptionProps) {
  const price = formatPlanPrice(plan.amount, plan.currency, locale);
  const interval = formatIntervalLabel(locale, plan.intervalCount, plan.intervalUnit);
  const description = plan.description ?? interval;
  const meta: string[] = [interval];

  if (plan.trialDays > 0) {
    meta.push(formatTrialLabel(locale, plan.trialDays));
  }

  if (plan.setupFee && plan.setupFee > 0) {
    const formattedFee = formatPlanPrice(plan.setupFee, plan.currency, locale);
    meta.push(`${subscriptionSetupFeeLabel}: ${formattedFee}`);
  }

  return (
    <label key={plan.id} className={`checkout-cta__option${isSelected ? " is-selected" : ""}`}>
      <input type="radio" name="checkout-option" value={plan.id} checked={isSelected} onChange={onSelect} />
      <div className="checkout-cta__option-body">
        <div className="checkout-cta__option-main">
          <div>
            <p className="checkout-cta__option-title">{plan.name}</p>
            <p className="checkout-cta__option-description">{description}</p>
          </div>
          <strong className="checkout-cta__option-price">{price}</strong>
        </div>
        <div className="checkout-cta__option-meta">
          {meta.map((item, index) => (
            <span key={`${plan.id}-${index}`}>{item}</span>
          ))}
        </div>
      </div>
    </label>
  );
}

function resolveCohortCode(course: CourseDetail): string | undefined {
  const candidate = (course as CourseDetail & { cohortCode?: string | null }).cohortCode;
  if (candidate) {
    return candidate.toUpperCase();
  }
  if (course.slug) {
    return course.slug.toUpperCase();
  }
  if (course.id) {
    return course.id.toUpperCase();
  }
  return undefined;
}

const RUSSIAN_MONTH_FORMS = ["месяц", "месяца", "месяцев"] as const;
const RUSSIAN_YEAR_FORMS = ["год", "года", "лет"] as const;
const RUSSIAN_DAY_FORMS = ["день", "дня", "дней"] as const;

function formatPlanPrice(amount: number, currency: string, locale: string): string {
  const resolvedLocale = locale.startsWith("ru") ? "ru-RU" : "en-US";
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatIntervalLabel(locale: string, count: number, unit: "month" | "year"): string {
  if (locale.startsWith("ru")) {
    const forms = unit === "month" ? RUSSIAN_MONTH_FORMS : RUSSIAN_YEAR_FORMS;
    const word = selectRussianPlural(count, forms);
    const prefix = count === 1 ? "Каждый" : "Каждые";
    return `${prefix} ${count} ${word}`;
  }

  const unitLabel = unit === "month" ? "month" : "year";
  const plural = count === 1 ? unitLabel : `${unitLabel}s`;
  return `Every ${count} ${plural}`;
}

function formatTrialLabel(locale: string, days: number): string {
  if (locale.startsWith("ru")) {
    const word = selectRussianPlural(days, RUSSIAN_DAY_FORMS);
    return `${days} ${word} пробного периода`;
  }

  const suffix = days === 1 ? "day" : "days";
  return `${days} ${suffix} free trial`;
}

function selectRussianPlural(count: number, forms: readonly [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return forms[1];
  }
  return forms[2];
}

function detectCurrency(price?: string | null): "RUB" | "USD" | "KZT" | undefined {
  if (!price) {
    return undefined;
  }
  const normalized = price.toUpperCase();
  if (/[₽]|RUB/.test(normalized)) {
    return "RUB";
  }
  if (/[$]|USD/.test(normalized)) {
    return "USD";
  }
  if (/[₸]|KZT/.test(normalized)) {
    return "KZT";
  }
  return undefined;
}
