var yearString = "2005";
var monthString = "7";

function newText(storyObject, yearString, monthString) {
    storyObject.setAttribute("data", "story/" + yearString + "-" + monthString + ".txt");
}
