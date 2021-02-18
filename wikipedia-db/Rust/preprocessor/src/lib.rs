use std::collections::{HashMap, VecDeque};
use std::fs::File;
use std::iter::FromIterator;

use ordered_float::OrderedFloat;
use rayon::prelude::*;

use crate::sql_extracts::categories::category::{AbstractCategory, Category, PageRanked};
use crate::sql_extracts::categories::category::category_hash::CategoryHash;
use crate::sql_extracts::categories::category_links::CategoryCategorySql;
use crate::sql_extracts::extractor::Extractor;

mod sql_extracts;
pub mod algebra;

#[cfg(test)]
mod tests;

#[derive(Debug)]
struct CategoryF {
	id: u32,
	parent: u32,
	data: f64,
}

pub fn extract(text: String) -> VecDeque<Category> {
	let extractor = Extractor::new::<Category>().unwrap();
	let mut vect: VecDeque<Category> = VecDeque::new();
	extractor.extract(&text, &mut vect);
	return vect;
}

pub fn extract_categories(text: String) -> HashMap<String, Category> {
	HashMap::from_iter(
		Extractor::new::<Category>().unwrap().extract_iter::<Category>(&text)
			.map(|cat| (String::from(cat.get_title()), cat))
	)
}


pub fn run(categories_files: File, category_links_file: File) {
	let mut categories: CategoryHash<_> =
		Extractor::extract_par_iter_file::<Category>(categories_files).collect();

	println!("{:?}", &categories.get_data());

	let category_links: Vec<_> =
		sql_extracts::categories::category_links::to_category_links_vec(
			&categories,
			Extractor::extract_par_iter_file::<CategoryCategorySql>(category_links_file),
		).collect();

	sql_extracts::calculate_degrees(&mut categories, category_links.iter());

	let vec = algebra::lib::make_vec(
		categories.get_data().par_iter().map(|c| c.get_id()));
	let matrix = algebra::lib::make_matrix(
		sql_extracts::calculate_nzc(&categories, &category_links)
			.map(|c| c.to_tuple_calculate()),
		vec.dim());

	let page_rank = algebra::page_rank::page_rank(&matrix, &vec, 0.0, 1e-20);

	// let mut tmp: Vec<_> = algebra::lib::collect(matrix, res).iter().map(|c| {
	// 	let (from, to, pr) = c.to_tuple();
	// 	CategoryF { id: from as u32, parent: to as u32, data: pr }
	// }).collect();
	// tmp.sort_by_key(|nzcf| OrderedFloat(nzcf.data));
	// // println!("{:?}", tmp);
	// tmp.iter().for_each(|vf| println!("{}\tid:{}, parent:{}", vf.data, vf.id, vf.parent))

	let final_category_links: Vec<_> =
		sql_extracts::collect_pr(
			&mut categories,
			category_links.par_iter(),
			page_rank.iter().map(|(id, value)| (id as u32, value))).collect();

	let mut category_vec: Vec<_> = categories.get_data().into_par_iter().collect();
	category_vec.sort_unstable_by_key(|c| OrderedFloat(c.get_pr()));
	category_vec.iter().for_each(|c| {
		println!("{:?}", c)
	})
}