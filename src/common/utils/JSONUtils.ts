class JSONUtils {
  _stringify(value: any): string {
    switch (typeof value) {
      case 'object': {
        return JSON.stringify(value);
      }
      default: {
        return String(value);
      }
    }
  }
}

const jSONUtils = new JSONUtils();
export default jSONUtils;
