export const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLocaleLowerCase('tr-TR').split(' ').map(word =>
        word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)
    ).join(' ');
};
