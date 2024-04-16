import { reportTaskError } from "./reportTaskError";
import { CleanupHandle } from "./sync";

type TaskFn = () => void;

interface Task {
    fn: TaskFn;
    destroyed: boolean;
}

/**
 * A queue for the deferred execution of task functions.
 */
export class TaskQueue {
    private queue: Task[] = [];
    private channel = new MessageChannel();

    /**
     * Enqueues a function to be executed in the next task queue iteration.
     *
     * Tasks are executed in a macro task to leave some room for the execution
     * of promise callbacks in between.
     *
     * See also https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth
     *
     * Returns a handle for the scheduled Task.
     * When the handle is destroyed, the task function will be prevented from executing.
     * Destroying the handle does nothing if the task function has already been executed.
     */
    enqueue(fn: TaskFn): CleanupHandle {
        const task: Task = {
            fn,
            destroyed: false
        };

        this.queue.push(task);
        if (this.queue.length === 1) {
            this.scheduleIteration();
        }

        return {
            destroy() {
                if (task.destroyed) {
                    return;
                }

                task.destroyed = true;
            }
        };
    }

    private messageHandler = () => this.runIteration();

    private scheduleIteration() {
        // register and unregister for every iteration otherwise node will not terminate
        // https://stackoverflow.com/a/61574326
        this.channel.port2.addEventListener("message", this.messageHandler);
        this.channel.port1.postMessage(""); // queue macro task
    }

    private runIteration() {
        this.channel.port2.removeEventListener("message", this.messageHandler);

        // Swap arrays so that NEW tasks are not queued into the same array;
        // they will be handled in the next iteration.
        const tasks = this.queue;
        this.queue = [];
        for (const task of tasks) {
            if (task.destroyed) {
                continue;
            }

            try {
                task.fn();
            } catch (e) {
                reportTaskError(e);
            }
        }
    }
}
