import 'react-toastify/dist/ReactToastify.css';

import * as React from 'react';

import { FaFrown, FaRedo, FaSmile } from 'react-icons/fa';
import { ToastContainer, ToastContent, toast } from 'react-toastify';

import { GiBroadsword } from 'react-icons/gi';
import Head from 'next/head';
import classNames from 'classnames';
import localForage from 'localforage';

enum Attack {
  EC = 'Ethereal Cannon',
  US = 'Ultra Spark',
  Arm = 'Armageddon',
  Basic = 'Basic Attack',
}

type MoveConfiguration = Record<
  Attack,
  {
    charge_rate: number;
    aoe: boolean;
    chance_for_basic: boolean;
    next_move?: Attack;
    reset_charge?: boolean;
  }
>;

const MOVE_CONFIUGRATION: MoveConfiguration = {
  [Attack.EC]: {
    charge_rate: 2,
    aoe: false,
    chance_for_basic: true,
    next_move: Attack.US,
  },
  [Attack.US]: {
    charge_rate: 2,
    aoe: true,
    chance_for_basic: true,
    next_move: Attack.Basic,
  },
  [Attack.Basic]: {
    charge_rate: 3,
    aoe: false,
    chance_for_basic: false,
    next_move: Attack.EC,
  },
  [Attack.Arm]: {
    charge_rate: 0,
    aoe: true,
    chance_for_basic: false,
    reset_charge: true,
  },
};

enum ReducerAction {
  SelectSpecial = 'SELECT_SPECIAL',
  SelectBasic = 'SELECT_BASIC',
  SelectArm = 'SELECT_ARMAGEDDON',
  Reset = 'RESET',
  Load = 'LOAD',
}

interface FightState {
  next_move: Attack;
  previous_moves: Attack[];
  charge: number;
}

interface FightAction {
  type: ReducerAction;
  payload?: FightState;
}

const initialFightState: FightState = {
  next_move: Attack.EC,
  previous_moves: [],
  charge: 0,
};

interface FightRecord {
  moves: Attack[];
  timestamp: string;
}

type RecordReducerAction = 'RECORD_WIN' | 'RECORD_LOSS' | 'LOAD';

interface RecordState {
  wins: FightRecord[];
  losses: FightRecord[];
}

interface RecordAction {
  type: RecordReducerAction;
  payload?: FightRecord | RecordState;
}

const initialRecordState: RecordState = {
  wins: [],
  losses: [],
};

function persistState<TState>(key: string, state: TState) {
  localForage.setItem(key, state);
  return state;
}

const RECORD_STATE_KEY = 'ffx_fight_tracker.record';
const FIGHT_STATE_KEY = 'ffx_fight_tracker.fight';

function recordReducer(dispatch: React.Dispatch<FightAction>) {
  return (state: RecordState, { type, payload }: RecordAction): RecordState => {
    const handleUpdate = (type: keyof RecordState) => {
      dispatch({ type: ReducerAction.Reset });
      return persistState<RecordState>(RECORD_STATE_KEY, {
        ...state,
        [type]: [...state[type], payload],
      });
    };

    switch (type) {
      case 'RECORD_WIN':
        return handleUpdate('wins');
      case 'RECORD_LOSS':
        return handleUpdate('losses');
      case 'LOAD':
        return payload as RecordState;
    }
  };
}

function fightReducer(
  state: FightState,
  { type, payload }: { type: ReducerAction; payload?: FightState }
) {
  const persistFightState = (state: FightState) =>
    persistState<FightState>(FIGHT_STATE_KEY, state);

  switch (type) {
    case ReducerAction.SelectSpecial: {
      const config = MOVE_CONFIUGRATION[state.next_move];
      toast.success(`${state.next_move} used!`);
      return persistFightState({
        next_move: config.next_move,
        charge: state.charge + config.charge_rate,
        previous_moves: [...state.previous_moves, state.next_move],
      });
    }

    case ReducerAction.SelectBasic: {
      const currentConfig = MOVE_CONFIUGRATION[state.next_move];
      const basicConfig = MOVE_CONFIUGRATION[Attack.Basic];
      toast.success(`${Attack.Basic} used!`);
      return persistFightState({
        next_move:
          state.next_move === Attack.Basic
            ? currentConfig.next_move
            : state.next_move,
        charge: state.charge + basicConfig.charge_rate,
        previous_moves: [...state.previous_moves, state.next_move],
      });
    }

    case ReducerAction.SelectArm: {
      toast.success(`${Attack.Arm} used!`);
      return persistFightState({
        ...state,
        charge: 0,
        previous_moves: [...state.previous_moves, Attack.Arm],
      });
    }

    case ReducerAction.Reset:
      return persistFightState(initialFightState);

    case ReducerAction.Load:
      return payload;

    default:
      return state;
  }
}

type ButtonVariants = 'Default' | 'Success' | 'Error';

function Button({
  variant = 'Default',
  children,
  icon,
  ...rest
}: React.ComponentProps<'button'> & {
  variant?: ButtonVariants;
  icon?: React.ReactNode;
}) {
  return (
    <button
      className={classNames(
        'inline-flex text-white font-bold rounded px-6 h-12 items-center space-x-2',
        { 'bg-blue-700 ': variant === 'Default' },
        { 'bg-green-700': variant === 'Success' },
        { 'bg-red-700': variant === 'Error' }
      )}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

const TOASTS: Record<
  RecordReducerAction,
  { type: 'success' | 'error'; message: ToastContent }
> = {
  RECORD_WIN: {
    type: 'success',
    message: 'Win recorded',
  },
  RECORD_LOSS: {
    type: 'error',
    message: 'Loss recorded',
  },
  LOAD: {
    type: 'success',
    message: 'State loaded',
  },
};

export default function Home() {
  const [state, dispatch] = React.useReducer<
    React.Reducer<FightState, FightAction>
  >(fightReducer, initialFightState);

  const [record, dispatchRecord] = React.useReducer<
    React.Reducer<RecordState, RecordAction>
  >(recordReducer(dispatch), initialRecordState);

  const config = MOVE_CONFIUGRATION[state.next_move];

  function handleFightRecord(recordType: RecordReducerAction) {
    return () => {
      const { type, message } = TOASTS[recordType];
      toast[type](message);

      dispatchRecord({
        type: recordType,
        payload: {
          moves: state.previous_moves,
          timestamp: new Date().toUTCString(),
        },
      });
    };
  }

  /**
   * More-or-less the "recommended" way to interact with asynchronous data (in this case localForage)
   * is via useEffect. useReducer's third argument doesn't allow for this behavior.
   */
  React.useEffect(() => {
    (async () => {
      const [localState, localRecord] = await Promise.all([
        localForage.getItem(FIGHT_STATE_KEY) as Promise<FightState>,
        localForage.getItem(RECORD_STATE_KEY) as Promise<RecordState>,
      ]);

      if (localState) {
        dispatch({ type: ReducerAction.Load, payload: localState });
      }

      if (localRecord) {
        dispatchRecord({ type: 'LOAD', payload: localRecord });
      }
    })();
  }, []);

  return (
    <>
      <Head>
        <title>FFX HD Superboss Fight Tracker</title>
      </Head>
      <header className="h-14 flex items-center shadow bg-white sticky top-0">
        <div className="px-4">
          <h1 className="font-bold">FFX HD Superboss Fight Tracker</h1>
        </div>
      </header>
      <div className="container px-6 mx-auto py-6 max-w-screen-md space-y-6">
        <header className="flex flex-col border-b pb-3 mb-4">
          <div className="flex items-center mb-2">
            <h2 className="text-3xl flex-grow">Nemesis</h2>
            <div>
              <button
                className="border border-blue-100 rounded bg-blue-50 px-4 py-1 inline-flex items-center space-x-2 text-sm"
                onClick={() => {
                  dispatch({ type: ReducerAction.Reset });
                }}
              >
                <FaRedo size={12} className="text-black text-opacity-75" />
                <span>Reset</span>
              </button>
            </div>
          </div>
          <ul className="flex space-x-3">
            <li>
              <strong>Wins:</strong> {record.wins.length}
            </li>
            <li>
              <strong>Losses:</strong> {record.losses.length}
            </li>
          </ul>
        </header>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
          }}
          className="flex flex-col"
        >
          <div className="flex flex-col sm:flex-row mb-4">
            <div className="mb-3 sm:mb-0 sm:order-1">
              <ul className="sm:flex items-center space-y-1 sm:space-y-0 sm:space-x-2">
                <li>
                  <strong>Armageddon Charge:</strong> {state.charge}
                </li>
                <li>
                  <strong>Next Target:</strong> {config.aoe ? 'AOE' : 'Single'}
                </li>
                <li>
                  <strong>Move Count:</strong> {state.previous_moves.length}
                </li>
              </ul>
            </div>
            <div className="flex-grow">
              <p className="text-lg">What move did Nemesis just use?</p>
            </div>
          </div>
          <div className="flex flex-col space-y-3">
            {state.charge >= 21 ? (
              <Button
                onClick={() => {
                  dispatch({ type: ReducerAction.SelectArm });
                }}
              >
                Armageddon
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    dispatch({ type: ReducerAction.SelectSpecial });
                  }}
                  icon={<GiBroadsword />}
                >
                  <span>{state.next_move}</span>
                </Button>
                {config.chance_for_basic ? (
                  <Button
                    onClick={() => {
                      dispatch({ type: ReducerAction.SelectBasic });
                    }}
                    icon={<GiBroadsword />}
                  >
                    {Attack.Basic}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </form>
        <form
          className="border-t pt-6"
          action=""
          onSubmit={(ev) => {
            ev.preventDefault();
          }}
        >
          <ul className="flex items-center justify-between">
            <li>
              <Button
                icon={<FaSmile />}
                variant="Success"
                onClick={handleFightRecord('RECORD_WIN')}
              >
                Won
              </Button>
            </li>
            <li>
              <Button
                icon={<FaFrown />}
                variant="Error"
                onClick={handleFightRecord('RECORD_LOSS')}
              >
                Lost
              </Button>
            </li>
          </ul>
        </form>
      </div>
      <ToastContainer
        autoClose={1500}
        newestOnTop
        toastClassName="font-bold"
        pauseOnHover={false}
        pauseOnFocusLoss={false}
      />
    </>
  );
}
