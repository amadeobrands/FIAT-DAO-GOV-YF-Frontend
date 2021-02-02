import React from 'react';
import * as Antd from 'antd';
import { ModalProps } from 'antd/lib/modal';

import Select, { SelectOption } from 'components/antd/select';

import { useWallet } from 'wallets/wallet';
import { LedgerWalletConfig } from 'wallets/connectors/ledger';

import s from './styles.module.css';

const WEB3_LEDGER_DERIVATION_PATHS: SelectOption[] = [
  {
    value: `m/44'/60'/0'`,
    label: `Ethereum - m/44'/60'/0'`,
  },
  {
    value: `m/44'/60'/0'/0`,
    label: `Ethereum - Ledger Live - m/44'/60'/0'/0`,
  },
];

export type LedgerDerivationPathModalProps = ModalProps & {};

const LedgerDerivationPathModal: React.FunctionComponent<LedgerDerivationPathModalProps> = props => {
  const { ...modalProps } = props;

  const wallet = useWallet();

  const [derivationPath, setDerivationPath] = React.useState<string>(
    String(WEB3_LEDGER_DERIVATION_PATHS[0].value),
  );

  function handleSelect(value: string | number) {
    setDerivationPath(String(value));
  }

  function handleConnect(ev: React.MouseEvent<HTMLElement>) {
    props.onCancel?.(ev);

    return wallet.connect(LedgerWalletConfig, {
      baseDerivationPath: derivationPath,
    });
  }

  return (
    <Antd.Modal className={s.component} centered footer={[]} {...modalProps}>
      <Select
        className={s.dropdown}
        options={WEB3_LEDGER_DERIVATION_PATHS}
        value={derivationPath}
        onSelect={handleSelect}
      />
      <Antd.Button
        type="primary"
        className={s.connectBtn}
        onClick={handleConnect}>
        Connect
      </Antd.Button>
    </Antd.Modal>
  );
};

export default LedgerDerivationPathModal;
