export interface MultiSelectConfig {
  id: string;
  labels?: Record<string, string>;
  onChange?: (selected: string[]) => void;
  options: string[];
  placeholder: string;
  selected: string[];
}
