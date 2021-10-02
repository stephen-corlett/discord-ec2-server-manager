enum CommandType {
  Start = 'start',
  Stop = 'stop',
  Status = 'status',
}

export type SupportedCommands = CommandType.Start | CommandType.Stop | CommandType.Status;

export default CommandType;
