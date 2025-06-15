import { cardHeaderStyles } from './cardHeader';
import { cardLayoutStyles } from './cardLayout';
import { itemRowStyles } from './itemRows';
import { formStyles } from './forms';
import { buttonStyles } from './buttons';
import { modalStyles } from './modals';
import { controlStyles } from './controls';
import { responsiveStyles } from './responsive';
import { CSSResult, css } from 'lit-element';

export const styles: CSSResult = css`
  ${cardLayoutStyles}
  ${itemRowStyles}
  ${formStyles}
  ${buttonStyles}
  ${modalStyles}
  ${controlStyles}
  ${responsiveStyles}
  ${cardHeaderStyles}
`;
