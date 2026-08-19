import { handleSource } from "../_shared.mjs";

export default function handler(request, response) {
  return handleSource("hh", request, response);
}
