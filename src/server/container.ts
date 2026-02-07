// Get the global container from @noego/app framework
// The framework manages the container lifecycle including scoped containers per request
import type { Container } from "@noego/ioc";
import { getContainer } from "@noego/app";
const container: Container = getContainer();
export default container;
