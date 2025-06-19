export default function (name: string, opts?: object) {
  return import(name, opts)
}
