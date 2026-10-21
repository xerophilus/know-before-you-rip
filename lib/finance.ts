export const money = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};
export function calculateScenario(
  cost: string,
  sale: string,
  fee: string,
  shipping: string,
  auto: string,
  other: string,
  individualShipping: string,
) {
  const fraction = Math.min(0.95, money(fee) / 100);
  return {
    sealedNet: money(sale) * (1 - fraction) - money(shipping),
    breakEven: (money(cost) + money(shipping)) / (1 - fraction),
    openedGross: money(auto) + money(other),
    openedNet:
      (money(auto) + money(other)) * (1 - fraction) - money(individualShipping),
    feeFraction: fraction,
  };
}
