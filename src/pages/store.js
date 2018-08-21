import { applyMiddleware, createStore } from 'redux'
import { wrapStore, alias } from 'react-chrome-redux'

const rootReducer = (state) => state;

const initialState = {
  lists: {
    activeId: null,
    records: [],
  }
}

const store = createStore(
  rootReducer,
  initialState,
  applyMiddleware(
  ),
)

wrapStore(store, {
  portName: 'MEMBRANE_EXTENSION',
})

export default store;
