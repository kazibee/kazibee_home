// Get the global container from @noego/app framework
// The framework manages the container lifecycle including scoped containers per request
// Deep import: '@noego/app/container' is runtime-portable (Node + workerd);
// the root '@noego/app' export drags in the Node-only CLI/runtime modules.
import type { Container } from "@noego/ioc";
import { getContainer } from "@noego/app/container";
const container: Container = getContainer();
export default container;
