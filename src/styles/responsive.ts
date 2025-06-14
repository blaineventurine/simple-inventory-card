export const responsiveStyles = `
  @media (max-width: 768px) {
    .controls-row {
      flex-direction: column;
      align-items: stretch;
    }
    
    .add-new-btn {
      width: 100%;
      margin-top: 8px;
    }

    .modal-content {
      padding: 24px;
      margin: 16px;
      width: calc(100% - 32px);
      border-radius: 12px;
    }

    .form-row {
      flex-direction: column;
      gap: 12px;
    }

    .modal-buttons {
      flex-direction: column-reverse;
    }

    .modal-buttons button {
      width: 100%;
    }
  }
  
  @media (min-width: 768px) {
    .item-row {
      flex-wrap: nowrap;
    }
    
    .add-btn {
      width: auto;
      margin-top: 0;
    }
  }
`;
