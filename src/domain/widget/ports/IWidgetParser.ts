/**
 * Port (interface) for parsing raw code block source into a typed config object.
 * Implementations live in the infrastructure layer.
 */
export interface IWidgetParser<T> {
  parse(source: string): T;
}
