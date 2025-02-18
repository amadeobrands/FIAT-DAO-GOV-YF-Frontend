import React, { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import BigNumber from 'bignumber.js';
import cn from 'classnames';
import TxConfirmModal from 'web3/components/tx-confirm-modal';
import Erc20Contract from 'web3/erc20Contract';
import { formatToken, formatUSD } from 'web3/utils';

import Alert from 'components/antd/alert';
import Spin from 'components/antd/spin';
import Tooltip from 'components/antd/tooltip';
import Icon from 'components/custom/icon';
import { TokenAmount, TokenSelect } from 'components/custom/token-amount-new';
// import { TokenAmount, TokenSelect } from 'components/custom/token-amount';
import { Text } from 'components/custom/typography';
import { KnownTokens, convertTokenInUSD, useKnownTokens } from 'components/providers/known-tokens-provider';
import config from 'config';
import { YfPoolContract } from 'modules/yield-farming/contracts/yfPool';

import { useYFPool } from '../../providers/pool-provider';
import { useYFPools } from '../../providers/pools-provider';

import s from './s.module.scss';

const PoolStake: FC = () => {
  const knownTokensCtx = useKnownTokens();
  const yfPoolsCtx = useYFPools();
  const yfPoolCtx = useYFPool();

  const [activeToken, setActiveToken] = useState(yfPoolCtx.poolMeta?.tokens[0]);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [staking, setStaking] = useState(false);
  const [amount, setAmount] = useState('');

  const { poolMeta } = yfPoolCtx;
  const activeContract = activeToken?.contract as Erc20Contract;

  if (!poolMeta || !activeToken) {
    return null;
  }

  const selectedStakedToken = yfPoolsCtx.stakingContract?.stakedTokens.get(activeToken.address);
  const allowance = activeContract.getAllowanceOf(config.contracts.yf.staking)?.unscaleBy(activeToken.decimals);
  const stakedBalance = selectedStakedToken?.nextEpochUserBalance?.unscaleBy(activeToken.decimals);
  const walletBalance = activeContract.balance?.unscaleBy(activeToken.decimals);
  const maxAmount = BigNumber.min(walletBalance ?? BigNumber.ZERO, allowance ?? BigNumber.ZERO);
  const bnAmount = BigNumber.from(amount);

  function handleTokenSelect(tokenSymbol: string) {
    const tokenMeta = knownTokensCtx.getTokenBySymbol(tokenSymbol);
    setActiveToken(tokenMeta);
  }

  async function handleEnable() {
    setEnabling(true);

    try {
      await activeContract.approve(true, yfPoolsCtx.stakingContract?.address!);
    } catch {}

    setEnabling(false);
  }

  function handleStake() {
    setConfirmModalVisible(true);
  }

  function handleStakeCancel() {
    setConfirmModalVisible(false);
  }

  async function handleStakeConfirm({ gasPrice }: any) {
    setConfirmModalVisible(false);

    let value = new BigNumber(amount);

    if (!activeToken || value.isNaN() || value.isLessThanOrEqualTo(BigNumber.ZERO)) {
      return Promise.reject();
    }

    setStaking(true);

    value = value.scaleBy(activeToken.decimals)!;

    try {
      await yfPoolsCtx.stakingContract?.stake(activeToken.address, value, gasPrice);

      setAmount('');
      yfPoolsCtx.stakingContract?.loadCommonFor(activeToken.address).catch(Error);
      yfPoolsCtx.stakingContract?.loadUserDataFor(activeToken.address).catch(Error);
      (poolMeta?.contract as YfPoolContract).loadCommon().catch(Error);
      (poolMeta?.contract as YfPoolContract).loadUserData().catch(Error);
      activeContract.loadBalance().catch(Error);
    } catch (e) {}

    setStaking(false);
  }

  return (
    <>
      <div className={cn('flexbox-list p-16 mb-32', s.stakeBlock)}>
        <div className="flex flow-row mr-16">
          <Text type="small" weight="semibold" color="secondary" className="mb-8">
            Staked balance
          </Text>
          <Tooltip title={formatUSD(convertTokenInUSD(stakedBalance, activeToken.symbol)) ?? '-'}>
            <Text type="p1" weight="semibold" color="primary">
              {formatToken(stakedBalance, {
                decimals: activeToken.decimals,
              }) ?? '-'}
            </Text>
          </Tooltip>
        </div>
        <div className="flex flow-row">
          <Text type="small" weight="semibold" color="secondary" className="mb-8">
            Wallet balance
          </Text>
          <Tooltip title={formatUSD(convertTokenInUSD(walletBalance, activeToken.symbol)) ?? '-'}>
            <Text type="p1" weight="semibold" color="primary">
              {formatToken(walletBalance, {
                decimals: activeToken.decimals,
              }) ?? '-'}
            </Text>
          </Tooltip>
        </div>
      </div>
      <TokenAmount
        before={
          poolMeta.tokens.length > 1 ? (
            <TokenSelect
              value={activeToken.symbol as KnownTokens}
              onChange={handleTokenSelect}
              tokens={poolMeta.tokens.map(t => t.symbol as KnownTokens)}
            />
          ) : (
            <Icon name={activeToken.icon!} width={24} height={24} />
          )
        }
        value={amount}
        name={activeToken.symbol}
        onChange={setAmount}
        max={maxAmount}
        placeholder={`0 (Max ${formatToken(maxAmount, { decimals: activeToken.decimals })})`}
        slider
        className="mb-40"
        classNameBefore={poolMeta.tokens.length > 1 ? 'ph-0' : ''}
      />

      {poolMeta.contract.isPoolEnded === true && (
        <>
          <Alert
            message={
              <div className="flex flow-row row-gap-16 align-start">
                <Text type="p2" weight="semibold" color="blue">
                  Deposits made after an epoch started will be considered as pro-rata figures in relation to the length
                  of the epoch.
                </Text>
              </div>
            }
            className="mb-32"
          />
          {activeToken.symbol === KnownTokens.ENTR && (
            <Alert
              className="mb-32"
              message={
                <div className="flex flow-row row-gap-16 align-start">
                  <Text type="p2" weight="semibold" color="blue">
                    You can still deposit {activeToken.symbol} in the DAO governance to earn interest for your funds.
                  </Text>
                  <Link to="/governance" className="link-blue">
                    <Text type="p2" weight="bold" style={{ textDecoration: 'underline' }}>
                      Go to governance staking
                    </Text>
                  </Link>
                </div>
              }
            />
          )}
        </>
      )}

      {poolMeta.contract.isPoolEnded === false && (
        <Alert
          className="mb-32"
          message="Deposits made after an epoch started will be considered as pro-rata figures in relation to the length of the epoch."
        />
      )}

      <div style={{ display: 'flex' }}>
        <button
          type="button"
          className="button-primary"
          disabled={
            !allowance?.gt(BigNumber.ZERO) ||
            !bnAmount ||
            !bnAmount.gt(BigNumber.ZERO) ||
            bnAmount.gt(maxAmount) ||
            staking
          }
          onClick={handleStake}>
          {staking && <Spin spinning />}
          Stake
        </button>

        {allowance?.eq(BigNumber.ZERO) && (
          <button
            type="button"
            className="button-primary"
            disabled={enabling}
            onClick={handleEnable}
            style={{ marginLeft: 10 }}>
            {enabling && <Spin spinning />}
            Enable {activeToken.symbol}
          </button>
        )}
      </div>

      {confirmModalVisible && (
        <TxConfirmModal
          title="Stake"
          header={
            <div className="flex align-center justify-center">
              <Text type="h2" weight="bold" color="primary" className="mr-8">
                {formatToken(bnAmount, {
                  decimals: activeToken.decimals,
                })}
              </Text>
              <Icon name={activeToken.icon!} />
            </div>
          }
          submitText={`Confirm your stake`}
          onCancel={handleStakeCancel}
          onConfirm={handleStakeConfirm}
        />
      )}
    </>
  );
};

export default PoolStake;
