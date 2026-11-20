import { cardHeaderStyles } from './cardHeader';
import { scanPanelStyles } from './scanPanel';
import { cardLayoutStyles } from './cardLayout';
import { itemRowStyles } from './itemRows';
import { itemTileStyles } from './itemTiles';
import { itemDetailStyles } from './itemDetail';
import { batchStyles } from './batches';
import { formFieldStyles } from './formFields';
import { formSwitchStyles } from './formSwitches';
import { formChipStyles } from './formChips';
import { formTagInputStyles } from './formTagInputs';
import { modalStyles } from './modals';
import { dataSheetStyles } from './dataSheets';
import { controlStyles } from './controls';
import { tokenStyles } from './tokens';
import { CSSResult, css } from 'lit-element';

export const styles: CSSResult = css`
  ${tokenStyles}
  ${cardLayoutStyles}
  ${itemRowStyles}
  ${itemTileStyles}
  ${itemDetailStyles}
  ${batchStyles}
  ${formFieldStyles}
  ${formSwitchStyles}
  ${formChipStyles}
  ${formTagInputStyles}
  ${modalStyles}
  ${dataSheetStyles}
  ${controlStyles}
  ${cardHeaderStyles}
  ${scanPanelStyles}
`;
