import * as React from 'react';
import { format } from 'date-fns';
import { Stack, PrimaryButton, Text, TextField } from '@fluentui/react';
import styles from './Caching.module.scss';
import { CacheManager } from '../utils/CacheManager';

interface IMyData {
  id: number;
  value: string;
}

const icons: string[] = ["😎", "🤩", "🙂", "😃", "👌", "💯", "🚀", "🔥", "🥳", "🤖"];
const LONG_OPERATION_DURATION = 5000;

const getRandomIcon = (): string =>
  icons[Math.floor(Math.random() * icons.length)];

const myLongOperation = async (): Promise<IMyData[]> => {
  console.log("Long operation started. Please wait...");
  return new Promise<IMyData[]>((resolve) => {
    setTimeout(() => {
      const icon = getRandomIcon();
      resolve([{ id: 1, value: `My Data: ${icon}` }]);
    }, LONG_OPERATION_DURATION);
  });
};

const CACHE_KEY = 'MyDataCache';

const Caching: React.FC = () => {
  const [expirationSeconds, setExpirationSeconds] = React.useState<number>(20);
  const [pendingExpiration, setPendingExpiration] = React.useState<string>(expirationSeconds.toString());
  const [data, setData] = React.useState<IMyData[]>([]);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [expirationDisplay, setExpirationDisplay] = React.useState<string>('Not set');
  const [currentTime, setCurrentTime] = React.useState<string>(format(new Date(), "HH:mm:ss"));

  const addLog = (message: string): void => {
    const timestamp = format(new Date(), "HH:mm:ss");
    setLogs(prev => [...prev, `${timestamp} - ${message}`]);
  };

  const updateExpirationDisplay = (): void => {
    const cacheItem = localStorage.getItem(CACHE_KEY);
    if (cacheItem) {
      try {
        const cacheJSON = JSON.parse(cacheItem);
        const exp = new Date(cacheJSON.expiration);
        setExpirationDisplay(format(exp, "HH:mm:ss"));
      } catch {
        setExpirationDisplay("Invalid");
      }
    } else {
      setExpirationDisplay("Not set");
    }
  };

  // Create an instance of CacheManager for IMyData[], passing addLog as the logger.
  const cacheManager = React.useMemo(
    () =>
      new CacheManager<IMyData[]>(
        CACHE_KEY,
        expirationSeconds,
        myLongOperation,
        (freshData) => {
          setData(freshData);
          updateExpirationDisplay();
          addLog(`Background refresh: new data loaded: [${freshData.map(d => d.value).join(", ")}].`);
        },
        addLog
      ),
    [expirationSeconds]
  );

  React.useEffect(() => {
    localStorage.removeItem(CACHE_KEY);
    addLog("Previous cache cleared on page load.");
    cacheManager.getData(false)
      .then(fetchedData => {
        setData(fetchedData);
        updateExpirationDisplay();
        addLog(`Data loaded from cache: [${fetchedData.map(d => d.value).join(", ")}].`);
      })
      .catch((error) => {
        console.error("Error fetching data in useEffect:", error);
        addLog(`Error fetching data in useEffect: ${error}`);
      });
  }, [cacheManager]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), "HH:mm:ss"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async (): Promise<void> => {
    addLog("Manual refresh triggered.");
    try {
      const updatedData = await cacheManager.getData(false);
      setData(updatedData);
      updateExpirationDisplay();
      addLog(`Manual refresh executed. New data: [${updatedData.map(d => d.value).join(", ")}].`);
    } catch (error) {
      console.error("Error during manual refresh:", error);
      addLog(`Error during manual refresh: ${error}`);
    }
  };

  const handleExpirationUpdate = async (): Promise<void> => {
    const parsed = parseInt(pendingExpiration, 10);
    if (!isNaN(parsed)) {
      setExpirationSeconds(parsed);
      localStorage.removeItem(CACHE_KEY);
      setLogs([]);
      setExpirationDisplay("Not set");
      addLog(`Expiration updated to ${parsed} seconds. Cache and event log reset.`);
      try {
        const updatedData = await cacheManager.getData(true);
        setData(updatedData);
        updateExpirationDisplay();
        addLog(`Data reloaded after expiration change: [${updatedData.map(d => d.value).join(", ")}].`);
      } catch (error) {
        console.error("Error during handleExpirationUpdate:", error);
        addLog(`Error during handleExpirationUpdate: ${error}`);
      }
    } else {
      addLog(`Invalid expiration value: ${pendingExpiration}`);
    }
  };

  return (
    <Stack tokens={{ childrenGap: 20, padding: 20 }} className={styles.caching}>
      <Text variant="xLarge">The right time to cache</Text>
      <Text variant="medium">Current time: {currentTime}</Text>
      <Text variant="medium">Current cache expiration: {expirationDisplay}</Text>
      <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="end">
        <TextField
          label="Cache expiration (seconds)"
          value={pendingExpiration}
          onChange={(_, newValue) => setPendingExpiration(newValue || "")}
          styles={{ root: { maxWidth: '100px' } }}
        />
        <PrimaryButton
          text="Update Expiration"
          onClick={handleExpirationUpdate}
          disabled={pendingExpiration === expirationSeconds.toString()}
          styles={{ root: { alignSelf: 'flex-end', height: 'auto' } }}
        />
      </Stack>
      <PrimaryButton text="Refresh Data" onClick={handleRefresh} styles={{ root: { maxWidth: '200px', width: 'auto' } }} />
      <Stack tokens={{ childrenGap: 10 }}>
        {data.map((item) => (
          <Text key={item.id} variant="medium">
            {item.value}
          </Text>
        ))}
      </Stack>
      <Stack tokens={{ childrenGap: 5 }} styles={{ root: { paddingTop: 20 } }}>
        <Text variant="large">Event Log</Text>
        {logs.map((log, index) => (
          <Text key={index} variant="small">
            {log}
          </Text>
        ))}
      </Stack>
    </Stack>
  );
};

export default Caching;