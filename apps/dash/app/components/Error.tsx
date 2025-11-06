export function ValidationError({ errors }: { errors: string[] | undefined }) {
  if (errors && errors?.length > 0) {
    return <div className="text-red-600 text-sm">{errors}</div>;
  }
}
