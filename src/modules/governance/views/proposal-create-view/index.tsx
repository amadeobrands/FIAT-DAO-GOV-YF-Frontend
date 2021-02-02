import React from 'react';
import { useHistory } from 'react-router';
import * as Antd from 'antd';
import { StoreValue } from 'rc-field-form/lib/interface';

import Card from 'components/antd/card';
import Form from 'components/antd/form';
import Input from 'components/antd/input';
import Textarea from 'components/antd/textarea';
import Button from 'components/antd/button';
import Grid from 'components/custom/grid';
import { Heading, Paragraph } from 'components/custom/typography';
import Icons from 'components/custom/icon';
import CreateProposalActionModal, {
  CreateProposalActionForm,
} from '../../components/create-proposal-action-modal';
import DeleteProposalActionModal from '../../components/delete-proposal-action-modal';
import ProposalActionCard from '../../components/proposal-action-card';

import { useWeb3Contracts } from 'web3/contracts';
import useMergeState from 'hooks/useMergeState';

import s from './styles.module.scss';

type NewProposalForm = {
  title: string;
  description: string;
  actions: CreateProposalActionForm[];
};

const InitialFormValues: NewProposalForm = {
  title: '',
  description: '',
  actions: [],
};

type ProposalCreateViewState = {
  showCreateActionModal: boolean;
  showDeleteActionModal: boolean;
  selectedAction?: CreateProposalActionForm;
  submitting: boolean;
};

const InitialState: ProposalCreateViewState = {
  showCreateActionModal: false,
  showDeleteActionModal: false,
  selectedAction: undefined,
  submitting: false,
};

const ProposalCreateView: React.FunctionComponent = () => {
  const history = useHistory();
  const web3c = useWeb3Contracts();

  const [form] = Antd.Form.useForm<NewProposalForm>();
  const [state, setState] = useMergeState<ProposalCreateViewState>(
    InitialState,
  );

  function handleBackClick() {
    history.push('/governance/proposals');
  }

  function handleCreateAction(payload: CreateProposalActionForm) {
    let actions = form.getFieldValue('actions');

    if (state.selectedAction) {
      actions = actions.map((action: CreateProposalActionForm) =>
        action === state.selectedAction ? payload : action,
      );
    } else {
      actions.push(payload);
    }

    form.setFieldsValue({
      actions,
    });
  }

  function handleActionDelete() {
    const { selectedAction } = state;

    if (selectedAction) {
      form.setFieldsValue({
        actions: form
          .getFieldValue('actions')
          .filter(
            (action: CreateProposalActionForm) => action !== selectedAction,
          ),
      });
    }

    setState({
      showDeleteActionModal: false,
      selectedAction: undefined,
    });
  }

  async function handleSubmit(values: NewProposalForm) {
    setState({ submitting: true });

    try {
      await form.validateFields();

      const payload = {
        title: values.title,
        description: values.description,
        ...values.actions.reduce(
          (a, c) => {
            if (!c.targetAddress) {
              return a;
            }

            a.targets.push(c.targetAddress);

            if (c.addFunctionCall) {
              a.signatures.push(c.functionSignature!);
              a.calldatas.push(c.functionEncodedParams!);
            } else {
              a.signatures.push('');
              a.calldatas.push('0x');
            }

            if (c.addValueAttribute) {
              a.values.push(c.actionValue!);
            } else {
              a.values.push('0');
            }

            return a;
          },
          {
            targets: [] as string[],
            signatures: [] as string[],
            calldatas: [] as string[],
            values: [] as string[],
          },
        ),
      };

      const proposal = await web3c.daoGovernance.actions.createProposal(
        payload,
      );
      form.setFieldsValue(InitialFormValues);
      history.push(`/governance/proposals/${proposal.returnValues.proposalId}`);
    } catch (e) {}

    setState({ submitting: false });
  }

  return (
    <Grid flow="row" gap={32}>
      <Grid flow="col">
        <Button
          type="link"
          icon={<Icons name="left-arrow" />}
          onClick={handleBackClick}>
          Proposals
        </Button>
      </Grid>

      <Grid flow="row" gap={16}>
        <Heading type="h1" bold color="grey900" className="mb-16">
          Create Proposal
        </Heading>
        <Form
          form={form}
          initialValues={InitialFormValues}
          validateTrigger={['onSubmit', 'onChange']}
          onFinish={handleSubmit}>
          <Grid flow="row" gap={32}>
            <Grid
              flow="col"
              gap={24}
              colsTemplate="repeat(auto-fit, minmax(0, 1fr))"
              align="start">
              <Card
                title={
                  <Paragraph type="p1" semiBold color="grey900">
                    Proposal description
                  </Paragraph>
                }>
                <Grid flow="row" gap={24}>
                  <Form.Item
                    name="title"
                    label="Title"
                    rules={[{ required: true, message: 'Required' }]}>
                    <Input
                      placeholder="Placeholder"
                      disabled={state.submitting}
                    />
                  </Form.Item>
                  <Form.Item
                    name="description"
                    label="Description"
                    hint=""
                    rules={[{ required: true, message: 'Required' }]}>
                    <Textarea
                      placeholder="Placeholder"
                      rows={6}
                      disabled={state.submitting}
                    />
                  </Form.Item>
                </Grid>
              </Card>

              <Card
                title={
                  <Paragraph type="p1" semiBold color="grey900">
                    Actions
                  </Paragraph>
                }>
                <Form.List
                  name="actions"
                  rules={[
                    {
                      validator: (_, value: StoreValue) => {
                        return value.length === 0
                          ? Promise.reject()
                          : Promise.resolve();
                      },
                      message: 'At least one action is required!',
                    },
                    {
                      validator: (
                        _,
                        value: StoreValue,
                        callback: (error?: string) => void,
                      ) => {
                        return value.length > 10
                          ? Promise.reject()
                          : Promise.resolve();
                      },
                      message: 'Maximum 10 actions are allowed!',
                    },
                  ]}>
                  {(fields, {}, { errors }) => (
                    <Grid flow="row" gap={24}>
                      {fields.map((field, index) => {
                        const fieldData: CreateProposalActionForm = form.getFieldValue(
                          ['actions', index],
                        );
                        const {
                          targetAddress,
                          functionSignature,
                          functionEncodedParams,
                          actionValue,
                        } = fieldData;

                        return (
                          <Form.Item key={field.key}>
                            <ProposalActionCard
                              title={`Action ${index + 1}`}
                              target={targetAddress}
                              signature={functionSignature!}
                              callData={functionEncodedParams!}
                              showSettings
                              onDeleteAction={() => {
                                setState({
                                  showDeleteActionModal: true,
                                  selectedAction: fieldData,
                                });
                              }}
                              onEditAction={() => {
                                setState({
                                  showCreateActionModal: true,
                                  selectedAction: fieldData,
                                });
                              }}
                            />
                          </Form.Item>
                        );
                      })}

                      <Button
                        type="ghost"
                        icon={<Icons name="plus-circle-outlined" />}
                        disabled={state.submitting}
                        className={s.addActionBtn}
                        onClick={() =>
                          setState({ showCreateActionModal: true })
                        }>
                        Add new action
                      </Button>

                      <Antd.Form.ErrorList errors={errors} />
                    </Grid>
                  )}
                </Form.List>
              </Card>
            </Grid>
            <div>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={state.submitting}>
                Create proposal
              </Button>
            </div>
          </Grid>
        </Form>

        {state.showCreateActionModal && (
          <CreateProposalActionModal
            visible
            edit={state.selectedAction !== undefined}
            initialValues={state.selectedAction}
            onCancel={() =>
              setState({
                showCreateActionModal: false,
                selectedAction: undefined,
              })
            }
            onSubmit={handleCreateAction}
          />
        )}

        {state.showDeleteActionModal && (
          <DeleteProposalActionModal
            visible
            onCancel={() =>
              setState({
                showDeleteActionModal: false,
                selectedAction: undefined,
              })
            }
            onOk={handleActionDelete}
          />
        )}
      </Grid>
    </Grid>
  );
};

export default ProposalCreateView;
