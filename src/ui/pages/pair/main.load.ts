interface RequestDataLike {
  url: string;
}

export default async function load(_req: RequestDataLike) {
  // Pairing is initiated client-side; no server data needed
  return {};
}
