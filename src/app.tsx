import React, { MouseEventHandler, Suspense, useEffect, useState } from 'react';
import {
  Button,
  CloseSquareIcon,
  HeartIcon,
  Loading,
  Spacer,
  SwipeableCard,
  Text,
} from './components/common';
import { ReferendumCard, VotesTable } from './components';
import { Referendum, ReferendumOngoing, Track, Vote, VoteType } from './types';
import { timeout } from './utils/promise';
import { getAllReferenda, getAllTracks } from './chain/referenda';
import { ApiPromise } from '@polkadot/api';
import { useApi } from './contexts/Api';
import { Network } from './utils/polkadot-api';

const FETCH_DATA_TIMEOUT = 15000; // in milliseconds

function LoadingScreen(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Loading />
      <Spacer y={2} />
      <Text
        h1
        size={60}
        css={{
          textAlign: 'center',
        }}
      >
        Get ready to vote!
      </Text>
    </div>
  );
}

function ActionBar({
  onAccept,
  onRefuse,
}: {
  onAccept: MouseEventHandler<HTMLButtonElement>;
  onRefuse: MouseEventHandler<HTMLButtonElement>;
}): JSX.Element {
  return (
    <div style={{ display: 'flex' }}>
      <Button
        color="success"
        onPress={onAccept}
        icon={<HeartIcon primaryColor="currentColor" filled />}
      />
      <Spacer x={2} />
      <Button
        color="error"
        onPress={onRefuse}
        icon={
          <CloseSquareIcon set="light" primaryColor="currentColor" filled />
        }
      />
    </div>
  );
}

function Main({
  tracks,
  referenda,
  voteOn,
}: {
  tracks: Map<number, Track>;
  referenda: Map<number, ReferendumOngoing>;
  voteOn: (index: number, vote: VoteType) => void;
}): JSX.Element {
  let topReferenda = 0;
  const { network } = useApi();
  return (
    <Suspense fallback={<LoadingScreen />}>
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {Array.from(referenda.entries()).map(([index, referendum]) => {
          topReferenda = index;
          return (
            <>
              {network && (
                <SwipeableCard
                  key={index}
                  onVote={(vote: VoteType) => voteOn(index, vote)}
                  drag={true}
                >
                  <ReferendumCard
                    network={network}
                    index={index}
                    tracks={tracks}
                    referendum={referendum}
                  />
                </SwipeableCard>
              )}
            </>
          );
        })}
      </div>
      <ActionBar
        onAccept={() => voteOn(topReferenda, VoteType.Aye)}
        onRefuse={() => voteOn(topReferenda, VoteType.Nay)}
      />
      <Spacer y={1} />
      <Text>{referenda.size} left</Text>
      <Spacer y={1} />
    </Suspense>
  );
}

function App(): JSX.Element {
  const [tracks, setTracks] = useState<Map<number, Track>>(new Map());
  const [referenda, setReferenda] = useState<Map<number, ReferendumOngoing>>(
    new Map()
  );
  const [error, setError] = useState<string>();
  const [votes, setVotes] = useState<Array<Vote>>([]);
  const { api, network } = useApi();
  console.log('api is connected', api);
  useEffect(() => {
    async function fetchData(api: ApiPromise) {
      setTracks(getAllTracks(api));

      // Retrieve all referenda, then display them
      await timeout(getAllReferenda(api), FETCH_DATA_TIMEOUT)
        .then((referenda) => {
          const ongoingdReferenda = new Map(
            [...referenda].filter(([_k, v]) => v.type == 'ongoing') as [
              number,
              ReferendumOngoing
            ][]
          );
          setReferenda(ongoingdReferenda);
        })
        .catch((e) => {
          console.error(`Failed to fetch referenda: ${e}`);
          setError('Failed to fetch data in time');
        });
    }
    api && fetchData(api);
  }, [api]);

  function voteOn(index: number, vote: VoteType) {
    setVotes([...votes, { vote, index }]);
    referenda?.delete(index);
    setReferenda(new Map([...referenda]));
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        {referenda?.size == 0 && votes?.length != 0 ? (
          <VotesTable votes={votes} />
        ) : (
          <Main voteOn={voteOn} tracks={tracks} referenda={referenda} />
        )}
        {error && <div>{error}</div>}
      </div>
    </>
  );
}

export default App;
