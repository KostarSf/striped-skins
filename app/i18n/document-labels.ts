import type { TFunction } from "i18next";

const legacyLabels = {
  "Начало доступной истории": "history.earliest",
  "Исходное состояние": "history.initial",
  "Создание группы": "history.createGroup",
  "Создание слоя": "history.createLayer",
  "Свойства слоя": "history.layerProperties",
  "Удаление слоя / группы": "history.deleteLayer",
  "Дублирование слоя / группы": "history.duplicateLayer",
  "Перемещение слоя": "history.moveLayer",
  "Объединение группы": "history.mergeGroup",
  "Объединение с нижним слоем": "history.mergeDown",
  "Параметры MLP": "history.metadata",
  Штрих: "history.stroke",
  "Выберите слой рисунка внутри группы": "paint.selectLayer",
  "Слой или его группа заблокированы": "paint.locked",
  "Слой или его группа скрыты": "paint.hidden",
} as const;

export function documentLabel(t: TFunction, label: string | null | undefined): string {
  if (!label) return "";
  const key: string = legacyLabels[label as keyof typeof legacyLabels] ?? label;
  switch (key) {
    case "history.earliest":
      return t("history.earliest");
    case "history.initial":
      return t("history.initial");
    case "history.createGroup":
      return t("history.createGroup");
    case "history.createLayer":
      return t("history.createLayer");
    case "history.layerProperties":
      return t("history.layerProperties");
    case "history.deleteLayer":
      return t("history.deleteLayer");
    case "history.duplicateLayer":
      return t("history.duplicateLayer");
    case "history.moveLayer":
      return t("history.moveLayer");
    case "history.mergeGroup":
      return t("history.mergeGroup");
    case "history.mergeDown":
      return t("history.mergeDown");
    case "history.metadata":
      return t("history.metadata");
    case "history.stroke":
      return t("history.stroke");
    case "history.resize":
      return t("history.resize");
    case "skin.parametersOnly":
      return t("skin.parametersOnly");
    case "paint.selectLayer":
      return t("paint.selectLayer");
    case "paint.locked":
      return t("paint.locked");
    case "paint.hidden":
      return t("paint.hidden");
    default:
      return label; // Preserve custom operation labels in imported projects.
  }
}
