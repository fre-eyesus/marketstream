import { parseJsonMessage } from "@marketstream/kafka";
import { TickSchema, type Tick } from "@marketstream/schemas";

type Message = Parameters<typeof parseJsonMessage>[0];

export function createTickHandler(
  processTick: (tick: Tick) => Promise<void>,
  onInvalid: (error: Error) => void
): (payload: Message) => Promise<void> {
  return async (payload) => {
    let tick: Tick;
    try {
      tick = TickSchema.parse(parseJsonMessage<unknown>(payload));
    } catch (error) {
      onInvalid(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    // Reject on dependency failures so Kafka does not acknowledge a lost tick.
    await processTick(tick);
  };
}
