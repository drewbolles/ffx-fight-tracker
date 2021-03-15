import * as React from 'react';

import Head from 'next/head';

enum Attack {
  EC = 'Ethereal Cannon',
  US = 'Ultra Spark',
  Arm = 'Armageddon',
  Basic = 'Basic',
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
}

interface State {
  next_move: Attack;
  previous_moves: Attack[];
  charge: number;
}

const initialState: State = {
  next_move: Attack.EC,
  previous_moves: [],
  charge: 0,
};

function reducer(state: State, { type }) {
  switch (type) {
    case ReducerAction.SelectSpecial: {
      const config = MOVE_CONFIUGRATION[state.next_move];
      return {
        next_move: config.next_move,
        charge: state.charge + config.charge_rate,
        previous_moves: [...state.previous_moves, state.next_move],
      };
    }

    case ReducerAction.SelectBasic: {
      const currentConfig = MOVE_CONFIUGRATION[state.next_move];
      const basicConfig = MOVE_CONFIUGRATION[Attack.Basic];
      return {
        next_move:
          state.next_move === Attack.Basic
            ? currentConfig.next_move
            : state.next_move,
        charge: state.charge + basicConfig.charge_rate,
        previous_moves: [...state.previous_moves, state.next_move],
      };
    }

    case ReducerAction.SelectArm: {
      return {
        ...state,
        charge: 0,
        previous_moves: [...state.previous_moves, Attack.Arm],
      };
    }

    case ReducerAction.Reset:
      return initialState;
  }
  return state;
}

function Button(props: React.ComponentProps<'button'>) {
  return (
    <button
      className="inline-flex bg-blue-700 text-white font-bold rounded px-4 h-14 items-center justify-center"
      {...props}
    />
  );
}

export default function Home() {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const config = MOVE_CONFIUGRATION[state.next_move];

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
      <div className="container px-4 mx-auto py-6 max-w-screen-md">
        <header className="flex items-center border-b pb-3 mb-4">
          <h2 className="text-3xl flex-grow">Nemesis</h2>
          <div>
            <button
              className="border border-blue-100 rounded bg-blue-50 px-4 py-1 inline-flex"
              onClick={() => {
                dispatch({ type: ReducerAction.Reset });
              }}
            >
              Reset
            </button>
          </div>
        </header>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
          }}
          className="flex flex-col"
        >
          <div className="flex flex-col sm:flex-row mb-4">
            <div className="mb-3 sm:mb-0 sm:order-1">
              <ul className="flex items-center space-x-2">
                <li>
                  <strong>Armageddon Charge:</strong> {state.charge}
                </li>
                <li>
                  <strong>Next Target:</strong> {config.aoe ? 'AOE' : 'Single'}
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
                >
                  <span>{state.next_move}</span>
                </Button>
                {config.chance_for_basic ? (
                  <Button
                    onClick={() => {
                      dispatch({ type: ReducerAction.SelectBasic });
                    }}
                  >
                    {Attack.Basic}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
