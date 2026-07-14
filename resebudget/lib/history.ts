import { dayKey, formatDayLabel } from "./dates";

export type DayGroup<T> = {
  key: string;
  label: string;
  totalSek: number;
  items: T[];
};

// Grupperar utgifter per lokal dag, nyast först, med dagsummor i SEK.
export function groupExpensesByDay<T extends { spentAt: string; amountSek: number }>(
  expenses: T[],
): DayGroup<T>[] {
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime(),
  );
  const groups: DayGroup<T>[] = [];
  for (const expense of sorted) {
    const key = dayKey(expense.spentAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: formatDayLabel(key), totalSek: 0, items: [] };
      groups.push(group);
    }
    group.items.push(expense);
    group.totalSek += expense.amountSek;
  }
  return groups;
}
