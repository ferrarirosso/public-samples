import * as React from 'react';
import { useState } from 'react';
import { TextField, PrimaryButton, Label, Dropdown, IDropdownOption, Spinner, SpinnerSize } from '@fluentui/react';
import styles from './ServiceBus.module.scss';
import { ServiceBusClient, ServiceBusReceivedMessage, ServiceBusReceiver, ServiceBusReceiverOptions } from '@azure/service-bus';

interface ReceivedMessageWithRenderedTimestamp extends ServiceBusReceivedMessage {
  renderedTimestamp: string;
}

const ServiceBus: React.FC<{}> = () => {

  const [endpoint, setEndpoint] = useState('');
  const [queueName, setQueueName] = useState('');
  const [payload, setPayload] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessageWithRenderedTimestamp[]>([]);
  const [receiveMode, setReceiveMode] = useState<"peekLock" | "receiveAndDelete">("peekLock");
  const [receiver, setReceiver] = useState<ServiceBusReceiver | null>(null);
  const [numMessages, setNumMessages] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const receiveModeOptions: IDropdownOption[] = [
    { key: 'peekLock', text: 'Peek Lock' },
    { key: 'receiveAndDelete', text: 'Receive and Delete' }
  ];

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString();
  };

  // Logic to send data to Azure Service Bus
  const handleSend = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const serviceBusClient = new ServiceBusClient(endpoint);
      const sender = serviceBusClient.createSender(queueName);
      await sender.sendMessages({ body: payload });
      setStatusMessage(`${formatTimestamp(new Date())}: Message sent successfully`);
    } catch (error) {
      setStatusMessage(`${formatTimestamp(new Date())}: Error sending message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const setupReceiver = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const serviceBusClient = new ServiceBusClient(endpoint);
      const receiverOptions: ServiceBusReceiverOptions = {
        receiveMode: receiveMode,
      };
      const receiver = serviceBusClient.createReceiver(queueName, receiverOptions);
      setReceiver(receiver);
      setStatusMessage(`${formatTimestamp(new Date())}: Receiver created successfully`);
    } catch (error) {
      setStatusMessage(`${formatTimestamp(new Date())}: Error setting up receiver: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiveMessages = async (): Promise<void> => {
    if (!receiver) {
      setStatusMessage(`${formatTimestamp(new Date())}: Receiver is not set up`);
      return;
    }
    setIsLoading(true);
    try {
      const myMessages = await receiver.receiveMessages(numMessages);
      setReceivedMessages(myMessages.map((message: ServiceBusReceivedMessage) => ({
        ...message,
        renderedTimestamp: formatTimestamp(new Date())
      })));
      setStatusMessage(`${formatTimestamp(new Date())}: Messages received successfully`);
    } catch (error) {
      setStatusMessage(`${formatTimestamp(new Date())}: Error receiving messages: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={`${styles.serviceBus}`}>
      <Label>Azure Service Bus Endpoint:</Label>
      <TextField value={endpoint} onChange={(e, newValue) => setEndpoint(newValue || '')} />
      <Label>Queue Name:</Label>
      <TextField value={queueName} onChange={(e, newValue) => setQueueName(newValue || '')} />
      <Label>Receive Mode:</Label>
      <Dropdown
        selectedKey={receiveMode}
        onChange={(e, option) => setReceiveMode(option?.key as "peekLock" | "receiveAndDelete")}
        options={receiveModeOptions}
      />
      <PrimaryButton text="Setup Receiver" onClick={async () => {
        setStatusMessage('');
        setReceivedMessages([]);
        await setupReceiver();
      }} />
      <Label>Payload:</Label>
      <TextField multiline rows={6} value={payload} onChange={(e, newValue) => setPayload(newValue || '')} />
      <div style={{ marginTop: '10px' }}>
        <PrimaryButton text="Send" onClick={handleSend} disabled={!receiver || isLoading} style={{ marginRight: '10px' }} />
        <PrimaryButton text="Receive" onClick={handleReceiveMessages} disabled={!receiver || isLoading} />
      </div>
      <Label>Number of Messages to Receive:</Label>
      <TextField
        type="number"
        value={numMessages.toString()}
        onChange={(e, newValue) => setNumMessages(parseInt(newValue || '10', 10))}
      />
      {isLoading && <Spinner size={SpinnerSize.medium} label="Processing..." />}
      {statusMessage && <Label>{statusMessage}</Label>}
      <div>
        <h3>Received Messages:</h3>
        {receivedMessages.map((message, index) => (
          <div key={index}>
            <Label>{`${message.renderedTimestamp}: ${JSON.stringify(message.body)}`}</Label>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ServiceBus;