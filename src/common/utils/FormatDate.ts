import moment from 'moment';

class FormatDate {
  convertTimeUTCtoLocalDate(inputDate: string) {
    return moment(inputDate).format('YYYY-MM-DD HH:mm:ss');
  }
}
export default FormatDate;
