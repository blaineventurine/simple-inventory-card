export interface MultiSelectConfig {
  id: string;
  options: string[];
  selected: string[];
  placeholder: string;
  onChange?: (selected: string[]) => void;
}
