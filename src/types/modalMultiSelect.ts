/** Config for template HTML generation */
export interface ModalMultiSelectConfig {
  id: string;
  placeholder: string;
  options: string[];
}

/** Config for JS initialization of an already-rendered multiselect */
export interface ModalMultiSelectInitConfig {
  id: string;
  options: string[];
  shadowRoot?: ShadowRoot;
}
