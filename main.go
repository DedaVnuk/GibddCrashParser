package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

type Data struct {
	Name  string
	Value string
}

type CrashInfo struct {
	Date         string
	DTP          int
	Death        int
	ChildDeath   int
	Injured      int
	ChildInjured int
	Values       []Data
}

func main() {
	resp, err := http.Get("https://xn--90adear.xn--p1ai/") // гибдд.рф
	if err != nil {
		fmt.Println(err)
		return
	}
	defer resp.Body.Close()

	page, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		fmt.Println(err)
		return
	}

	// регулярка для поиска даты
	date_regex := regexp.MustCompile(`\d{2}\.\d{2}\.\d{4}`)

	var crashInfo CrashInfo
	page.Find(".b-crash-stat tr").Each(func(tr_index int, tr *goquery.Selection) {
		if tr_index == 0 {
			crashInfo.Date = date_regex.FindString(tr.Text())
		} else {
			data := Data{}
			tr.Find("td").Each(func(td_index int, td *goquery.Selection) {
				if td_index == 0 {
					data.Name = td.Text()
				} else if td_index == 1 {
					data.Value = td.Text()
				}
			})
			crashInfo.Values = append(crashInfo.Values, data)
		}
	})

	var fields_headers string = "Дата,"
	var fields_str string = crashInfo.Date + ","

	fmt.Printf("Данные за %s \n", crashInfo.Date)
	for _, value := range crashInfo.Values {
		fields_headers += value.Name + ","
		fields_str += value.Value + ","
		fmt.Printf("%s -> %s \n", value.Name, value.Value)
	}

	crash_info_file_name := "crash_info_file.csv"
	crash_info_file, err := os.OpenFile(crash_info_file_name, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	defer crash_info_file.Close()

	var last_parse_date string
	file_bytes, err := ioutil.ReadFile(crash_info_file_name)
	if len(file_bytes) != 0 {

		csv_strings := strings.Split(string(file_bytes), "\n")
		last_row_words := strings.Split(csv_strings[len(csv_strings)-2], ",")

		last_parse_date = last_row_words[0]
	}

	if last_parse_date != crashInfo.Date {

		file_stat, _ := crash_info_file.Stat()
		if file_stat.Size() == 0 {
			crash_info_file.WriteString(strings.Trim(fields_headers, ",") + "\n")
		}

		crash_info_file.WriteString(strings.Trim(fields_str, ",") + "\n")
	}
}
