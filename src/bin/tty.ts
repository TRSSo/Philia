import { getLogger } from "#logger"
import Tui from "#protocol/tty"

new Tui(getLogger("TTY")).main()
