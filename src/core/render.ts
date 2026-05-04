import { causalityReconciler as reconciler, resetCausality, enableInputHandlers } from './causalityReconciler';

let keepAlive = true;

export function render(element: any, container?: any) {
  resetCausality();

  const rootContainer = container || {
    children: [],
    __isTermContainer: true,
  };

  const root = reconciler.createContainer(
    rootContainer,
    0,
    false,
    null,
    false,
    null,
    () => {},
    null
  );

  reconciler.updateContainer(element, root, null, () => {});

  enableInputHandlers();

  return {
    update: (newElement: any) => {
      reconciler.updateContainer(newElement, root, null, () => {});
    },
    stop: () => {
      keepAlive = false;
    },
  };
}