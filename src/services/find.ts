/**
 * Find the greatest number in an array of string numbers.
 *
 * @param arr - array of string numbers.
 * @returns - the greatest number in the array.
 */
export const findGreatest = (arr: string[]) => {
  let greatest = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (parseInt(arr[i]) > parseInt(greatest)) {
      greatest = arr[i];
    }
  }
  return greatest;
};
