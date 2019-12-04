package main

import (
	"encoding/csv"
	"fmt"
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
	var parse_date string

	var crash_values []Data
	page.Find(".b-crash-stat tr").Each(func(tr_index int, tr *goquery.Selection) {
		if tr_index == 0 {
			parse_date = date_regex.FindString(tr.Text())
		} else {
			data := Data{}
			tr.Find("td").Each(func(td_index int, td *goquery.Selection) {
				if td_index == 0 {
					data.Name = td.Text()
				} else if td_index == 1 {
					data.Value = td.Text()
				}
			})

			crash_values = append(crash_values, data)
		}
	})

	var fields_headers string = "Дата,"
	var fields_str string = parse_date + ","

	fmt.Printf("Данные за %s \n", parse_date)
	for _, value := range crash_values {
		fields_headers += value.Name + ","
		fields_str += value.Value + ","
		fmt.Printf("%s -> %s \n", value.Name, value.Value)
	}

	crash_info_file_name := "crash_info_file.csv"

	crash_info_file, err := os.OpenFile(crash_info_file_name, os.O_APPEND|os.O_RDWR|os.O_CREATE, 0755)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer crash_info_file.Close()

	crash_info_file_stat, _ := crash_info_file.Stat()

	csv_bytes := make([]byte, crash_info_file_stat.Size())
	_, err = crash_info_file.Read(csv_bytes)
	if err != nil {
		fmt.Println(err)
		return
	}

	var last_parse_date string
	if crash_info_file_stat.Size() > 0 {

		crash_info_file_reader := strings.NewReader(string(csv_bytes))
		csv_reader := csv.NewReader(crash_info_file_reader)

		csv_rows, _ := csv_reader.ReadAll()

		last_row := csv_rows[len(csv_rows)-1]
		last_parse_date = last_row[0]
	}

	if last_parse_date != parse_date {

		if crash_info_file_stat.Size() == 0 {
			crash_info_file.WriteString(strings.Trim(fields_headers, ",") + "\n")
		}

		crash_info_file.WriteString(strings.Trim(fields_str, ",") + "\n")
	}
}
