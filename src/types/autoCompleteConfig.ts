export interface AutoCompleteConfig {
  id: string;
  value?: string;
  placeholder?: string;
  options: string[];
  onSelect?: (value: string) => void;
  onChange?: (value: string) => void;
}
