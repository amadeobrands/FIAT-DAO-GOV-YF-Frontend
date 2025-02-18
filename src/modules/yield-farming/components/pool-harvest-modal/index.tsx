import React, { FC, useState } from 'react';
import BigNumber from 'bignumber.js';
import Erc20Contract from 'web3/erc20Contract';
import { formatToken } from 'web3/utils';

import Modal, { ModalProps } from 'components/antd/modal';
import Spin from 'components/antd/spin';
import Grid from 'components/custom/grid';
import Icon, { IconNames } from 'components/custom/icon';
import IconsSet from 'components/custom/icons-set';
import { Text } from 'components/custom/typography';
import { EnterToken } from 'components/providers/known-tokens-provider';

import { useYFPools } from '../../providers/pools-provider';
import s from './s.module.scss';

type PoolHarvestButtonProps = {
  icons: string[];
  label: string;
  reward?: BigNumber;
  loading: boolean;
  onClick: () => void;
};

const PoolHarvestButton: FC<PoolHarvestButtonProps> = props => {
  const { icons, label, reward, loading, onClick } = props;

  return (
    <Spin spinning={loading}>
      <button
        type="button"
        className="button-ghost p-24"
        style={{ width: '100%' }}
        disabled={loading || !reward?.gt(BigNumber.ZERO)}
        onClick={onClick}>
        <div className="flex flow-row align-start" style={{ width: '100%', zIndex: 1 }}>
          <div className="flex flow-row align-start mb-24">
            <IconsSet
              icons={icons.map(icon => (
                <Icon key={icon} name={icon as IconNames} width={40} height={40} />
              ))}
              className="mb-8"
            />
            <Text type="p1" weight="semibold" color="primary">
              {label}
            </Text>
          </div>
          <div className="flex flow-row align-start">
            <Text type="lb2" weight="semibold" color="secondary" className="mb-8">
              Reward
            </Text>
            <Text type="p1" weight="semibold" color="primary" className="mr-4">
              {formatToken(reward, {
                tokenName: EnterToken.symbol,
              }) ?? '-'}
            </Text>
          </div>
        </div>
      </button>
    </Spin>
  );
};

const PoolHarvestModal: FC<ModalProps> = props => {
  const { ...modalProps } = props;

  const yfPoolsCtx = useYFPools();
  const [harvesting, setHarvesting] = useState(new Map<string, boolean>());

  async function handleHarvest(yfPoolID: string) {
    setHarvesting(prevState => {
      prevState.set(yfPoolID, true);
      return prevState;
    });

    try {
      const yfPool = yfPoolsCtx.getYFKnownPoolByName(yfPoolID);
      await yfPool?.contract.claim();
      yfPool?.contract.loadUserData().catch(Error);
      (EnterToken.contract as Erc20Contract).loadBalance().catch(Error);
    } catch (e) {}

    setHarvesting(prevState => {
      prevState.set(yfPoolID, false);
      return prevState;
    });
  }

  return (
    <Modal width={832} {...modalProps}>
      <div className="flex flow-row">
        <div className="flex flow-row mb-32">
          <Text type="h2" weight="semibold" color="primary" className="mb-8" font="secondary">
            Claim your reward
          </Text>
          <Text type="p1" weight="semibold" color="secondary">
            Select the pool you want to claim your reward from
          </Text>
        </div>
        <Grid flow="row" gap={24} className={s.grid}>
          {yfPoolsCtx.yfPools.map(yfPool => (
            <PoolHarvestButton
              key={yfPool.name}
              icons={yfPool.icons}
              label={yfPool.label}
              reward={yfPool.contract.toClaim?.unscaleBy(EnterToken.decimals)}
              loading={harvesting.get(yfPool.name) === true}
              onClick={() => handleHarvest(yfPool.name)}
            />
          ))}
        </Grid>
      </div>
    </Modal>
  );
};

export default PoolHarvestModal;
